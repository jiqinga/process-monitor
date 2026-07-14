import type { Condition } from '@/types';

/**
 * One flat row from the rule-form "multi-condition" UI before it has been
 * collapsed into a nested {@link Condition} tree.
 *
 * `logic` is the connector to the **previous** row; the very first row's
 * `logic` is ignored by {@link buildCondition} — when present, the connector
 * between row 0 and row 1 is read from `items[1].logic`.
 */
export interface ConditionFormItem {
  metric: 'Cpu' | 'Memory';
  comparison: 'Gt' | 'Gte' | 'Lt' | 'Lte' | 'Eq';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
  logic: 'and' | 'or';
}

export type ConditionMode = 'single' | 'multi';

interface Group {
  logic: 'and' | 'or';
  leaves: Condition[];
}

function toLeaf(item: ConditionFormItem): Condition {
  return {
    type: 'leaf',
    metric: item.metric,
    threshold: item.threshold,
    memory_threshold_type: item.memory_threshold_type,
    comparison: item.comparison,
  };
}

function wrapGroup(g: Group): Condition {
  if (g.leaves.length === 1) return g.leaves[0];
  return g.logic === 'and'
    ? { type: 'and', conditions: g.leaves }
    : { type: 'or', conditions: g.leaves };
}

/**
 * Convert the flat condition rows from the rule-form UI into the nested
 * {@link Condition} tree expected by the backend.
 *
 * Algorithm:
 *  1. Returns `undefined` if `mode !== 'multi'` or `items` is empty.
 *  2. A single item collapses to a leaf — its `logic` is irrelevant.
 *  3. Otherwise, consecutive rows with the same `logic` form one group.
 *     The outer combinator is the **opposite** of `groups[0].logic`, which
 *     mirrors how a human reads "A AND B OR C" as `(A AND B) OR C`.
 *  4. Single-leaf groups are not wrapped in an extra And/Or node.
 */
export function buildCondition(
  items: readonly ConditionFormItem[],
  mode: ConditionMode,
): Condition | undefined {
  if (mode !== 'multi' || items.length === 0) return undefined;

  if (items.length === 1) {
    return toLeaf(items[0]);
  }

  const groups: Group[] = [];
  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    const leaf = toLeaf(c);
    // First row's `logic` field is ignored — connector to row 1 lives on items[1].
    const logic = i === 0 ? (items[1]?.logic ?? 'and') : c.logic;
    if (groups.length === 0 || (i > 0 && groups[groups.length - 1].logic !== c.logic)) {
      groups.push({ logic, leaves: [leaf] });
    } else {
      groups[groups.length - 1].leaves.push(leaf);
    }
  }

  if (groups.length === 1) {
    return wrapGroup(groups[0]);
  }

  const outerLogic: 'and' | 'or' = groups[0].logic === 'and' ? 'or' : 'and';
  const subConditions: Condition[] = groups.map(wrapGroup);
  return outerLogic === 'and'
    ? { type: 'and', conditions: subConditions }
    : { type: 'or', conditions: subConditions };
}
