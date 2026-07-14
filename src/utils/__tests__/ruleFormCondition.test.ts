import { describe, expect, it } from 'vitest';
import { buildCondition, type ConditionFormItem } from '../ruleFormCondition';

function row(overrides: Partial<ConditionFormItem> = {}): ConditionFormItem {
  return {
    metric: 'Cpu',
    comparison: 'Gt',
    threshold: 80,
    memory_threshold_type: 'Percent',
    logic: 'and',
    ...overrides,
  };
}

describe('buildCondition', () => {
  describe('returns undefined for non-emitting inputs', () => {
    it('single mode is always discarded', () => {
      expect(buildCondition([row()], 'single')).toBeUndefined();
    });

    it('empty list in multi mode', () => {
      expect(buildCondition([], 'multi')).toBeUndefined();
    });
  });

  describe('single-row collapses to a leaf', () => {
    it('emits a leaf with the row fields verbatim', () => {
      const result = buildCondition(
        [row({ metric: 'Memory', comparison: 'Lte', threshold: 50, memory_threshold_type: 'Mb' })],
        'multi',
      );
      expect(result).toEqual({
        type: 'leaf',
        metric: 'Memory',
        threshold: 50,
        memory_threshold_type: 'Mb',
        comparison: 'Lte',
      });
    });

    it('ignores the single row logic field', () => {
      const a = buildCondition([row({ logic: 'and' })], 'multi');
      const b = buildCondition([row({ logic: 'or' })], 'multi');
      expect(a).toEqual(b);
    });
  });

  describe('uniform-logic groups collapse to a single And/Or', () => {
    it('two AND-joined rows', () => {
      const result = buildCondition(
        [row({ threshold: 50 }), row({ logic: 'and', threshold: 70 })],
        'multi',
      );
      expect(result).toEqual({
        type: 'and',
        conditions: [
          expect.objectContaining({ type: 'leaf', threshold: 50 }),
          expect.objectContaining({ type: 'leaf', threshold: 70 }),
        ],
      });
    });

    it('three OR-joined rows', () => {
      const result = buildCondition(
        [
          row({ threshold: 10 }),
          row({ logic: 'or', threshold: 20 }),
          row({ logic: 'or', threshold: 30 }),
        ],
        'multi',
      );
      expect(result).toEqual({
        type: 'or',
        conditions: expect.arrayContaining([
          expect.objectContaining({ threshold: 10 }),
          expect.objectContaining({ threshold: 20 }),
          expect.objectContaining({ threshold: 30 }),
        ]),
      });
      // arrayContaining doesn't pin length — assert separately
      expect((result as { conditions: unknown[] }).conditions).toHaveLength(3);
    });

    it("first row's logic is read from row 1 when uniform", () => {
      // First row carries logic='and' but the actual connector is items[1].logic='or'.
      // Algorithm should treat the whole list as a single OR group.
      const result = buildCondition(
        [
          row({ threshold: 10, logic: 'and' }),
          row({ threshold: 20, logic: 'or' }),
          row({ threshold: 30, logic: 'or' }),
        ],
        'multi',
      );
      expect((result as { type: string }).type).toBe('or');
    });
  });

  describe('mixed-logic produces nested groups', () => {
    it('A AND B OR C → outer OR with [AND(A,B), leaf C]', () => {
      // items[0].logic is ignored; items[1].logic=and joins rows 0-1; items[2].logic=or starts new group
      const result = buildCondition(
        [
          row({ threshold: 10 }),
          row({ logic: 'and', threshold: 20 }),
          row({ logic: 'or', threshold: 30 }),
        ],
        'multi',
      );
      // First group is `and` -> outer becomes its opposite: `or`
      expect(result).toEqual({
        type: 'or',
        conditions: [
          {
            type: 'and',
            conditions: [
              expect.objectContaining({ threshold: 10 }),
              expect.objectContaining({ threshold: 20 }),
            ],
          },
          expect.objectContaining({ type: 'leaf', threshold: 30 }),
        ],
      });
    });

    it('A OR B AND C → outer AND with [OR(A,B), leaf C]', () => {
      const result = buildCondition(
        [
          row({ threshold: 10 }),
          row({ logic: 'or', threshold: 20 }),
          row({ logic: 'and', threshold: 30 }),
        ],
        'multi',
      );
      expect(result).toEqual({
        type: 'and',
        conditions: [
          {
            type: 'or',
            conditions: [
              expect.objectContaining({ threshold: 10 }),
              expect.objectContaining({ threshold: 20 }),
            ],
          },
          expect.objectContaining({ type: 'leaf', threshold: 30 }),
        ],
      });
    });

    it('A AND B OR C AND D → outer OR with [AND(A,B), leaf C, leaf D]', () => {
      // QUIRK: the algorithm opens a fresh group on every `logic` switch, so
      // `... OR C AND D` does NOT collapse C and D into AND(C,D). Instead C
      // and D each form their own single-leaf group, which then unwrap to
      // bare leaves at the outer level. Users who expect operator-precedence
      // grouping have to insert parens via the UI — that responsibility lives
      // in the form, not here.
      const result = buildCondition(
        [
          row({ threshold: 1 }),
          row({ logic: 'and', threshold: 2 }),
          row({ logic: 'or', threshold: 3 }),
          row({ logic: 'and', threshold: 4 }),
        ],
        'multi',
      );
      expect(result).toEqual({
        type: 'or',
        conditions: [
          {
            type: 'and',
            conditions: [
              expect.objectContaining({ threshold: 1 }),
              expect.objectContaining({ threshold: 2 }),
            ],
          },
          expect.objectContaining({ type: 'leaf', threshold: 3 }),
          expect.objectContaining({ type: 'leaf', threshold: 4 }),
        ],
      });
    });

    it('single-leaf groups are not wrapped in extra And/Or', () => {
      // A OR B AND C AND D → first group=[A] (leaf), second=[B], third=[C,D]
      // Wait: logic transitions occur when items[i].logic differs from previous group.
      // items: [A(and-ignored), B(or), C(and), D(and)]
      //   i=0 leaf A, group[0]={ logic: items[1].logic='or', leaves:[A] }
      //   i=1 c.logic='or' === group[0].logic → push to group[0]: [A,B]
      //   i=2 c.logic='and' !== 'or' → new group[1]={logic:'and',leaves:[C]}
      //   i=3 c.logic='and' === group[1].logic → push: [C,D]
      // groups[0].logic='or' → outer = 'and'
      // expected: AND(OR(A,B), AND(C,D))
      const result = buildCondition(
        [
          row({ threshold: 1 }),
          row({ logic: 'or', threshold: 2 }),
          row({ logic: 'and', threshold: 3 }),
          row({ logic: 'and', threshold: 4 }),
        ],
        'multi',
      );
      expect(result).toEqual({
        type: 'and',
        conditions: [
          {
            type: 'or',
            conditions: [
              expect.objectContaining({ threshold: 1 }),
              expect.objectContaining({ threshold: 2 }),
            ],
          },
          {
            type: 'and',
            conditions: [
              expect.objectContaining({ threshold: 3 }),
              expect.objectContaining({ threshold: 4 }),
            ],
          },
        ],
      });
    });
  });

  describe('field plumbing', () => {
    it('passes metric/threshold/memory_threshold_type/comparison verbatim to each leaf', () => {
      const result = buildCondition(
        [
          row({
            metric: 'Cpu',
            threshold: 90,
            comparison: 'Gte',
            memory_threshold_type: 'Percent',
          }),
          row({
            logic: 'and',
            metric: 'Memory',
            threshold: 512,
            comparison: 'Lt',
            memory_threshold_type: 'Mb',
          }),
        ],
        'multi',
      );
      expect(result).toEqual({
        type: 'and',
        conditions: [
          {
            type: 'leaf',
            metric: 'Cpu',
            threshold: 90,
            memory_threshold_type: 'Percent',
            comparison: 'Gte',
          },
          {
            type: 'leaf',
            metric: 'Memory',
            threshold: 512,
            memory_threshold_type: 'Mb',
            comparison: 'Lt',
          },
        ],
      });
    });
  });
});
