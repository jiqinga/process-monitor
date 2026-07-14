import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useTrendDerived } from '../useTrendDerived';
import type { ProcessHistory } from '@/types';

function makeHistory(over: Partial<ProcessHistory> = {}): ProcessHistory {
  return {
    pid: 1,
    name: 'app',
    display_name: 'App',
    timestamps: [],
    cpu_history: [],
    memory_history: [],
    ...over,
  };
}

describe('useTrendDerived', () => {
  describe('empty / null inputs', () => {
    it('null data → slice null, hasData false, currentValue null, stats null', () => {
      const data = ref<ProcessHistory | null>(null);
      const range = ref(30);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      expect(d.slice.value).toBeNull();
      expect(d.hasData.value).toBe(false);
      expect(d.currentValue.value).toBeNull();
      expect(d.stats.value).toBeNull();
      expect(d.valueSeverityClass.value).toBe('');
    });

    it('empty arrays → hasData false', () => {
      const data = ref<ProcessHistory | null>(makeHistory());
      const range = ref(30);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      expect(d.hasData.value).toBe(false);
      expect(d.currentValue.value).toBeNull();
    });
  });

  describe('slice + currentValue', () => {
    it('takes the last N points where N = selectedRange', () => {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [1, 2, 3, 4, 5],
          cpu_history: [10, 20, 30, 40, 50],
          memory_history: [100, 200, 300, 400, 500],
        }),
      );
      const range = ref(3);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      expect(d.slice.value?.ts).toEqual([3, 4, 5]);
      expect(d.slice.value?.vals).toEqual([30, 40, 50]);
      expect(d.currentValue.value).toBe(50);
    });

    it('range larger than data length → returns full data', () => {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [1, 2],
          cpu_history: [5, 10],
          memory_history: [50, 100],
        }),
      );
      const range = ref(1000);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      expect(d.slice.value?.vals.length).toBe(2);
      expect(d.currentValue.value).toBe(10);
    });

    it('switches series when dataKey changes via getter', () => {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [1, 2],
          cpu_history: [10, 20],
          memory_history: [100, 200],
        }),
      );
      const key = ref<'cpu_history' | 'memory_history'>('cpu_history');
      const range = ref(10);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => key.value,
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      expect(d.currentValue.value).toBe(20);
      key.value = 'memory_history';
      expect(d.currentValue.value).toBe(200);
    });
  });

  describe('stats aggregation', () => {
    it('computes min/max/avg and peak time from the sliced window', () => {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [100, 200, 300],
          cpu_history: [10, 90, 50],
          memory_history: [0, 0, 0],
        }),
      );
      const range = ref(10);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      const s = d.stats.value;
      expect(s).not.toBeNull();
      expect(s?.min).toBe(10);
      expect(s?.max).toBe(90);
      expect(s?.avg).toBe(50);
      // peak time is from timestamp[1]=200 → HH:MM:SS of unix 200
      expect(s?.peakTimeStr).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('stats narrow to the sliced window — earlier points are excluded', () => {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [1, 2, 3, 4, 5],
          cpu_history: [99, 99, 10, 20, 30],
          memory_history: [0, 0, 0, 0, 0],
        }),
      );
      const range = ref(3);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => undefined,
        criticalThreshold: () => undefined,
      });

      const s = d.stats.value;
      // window is [10, 20, 30] — not [99, 99, 10]
      expect(s?.max).toBe(30);
      expect(s?.min).toBe(10);
    });
  });

  describe('valueSeverityClass', () => {
    function makeWithThresholds(currentVal: number, warn?: number, crit?: number) {
      const data = ref<ProcessHistory | null>(
        makeHistory({
          timestamps: [1],
          cpu_history: [currentVal],
          memory_history: [0],
        }),
      );
      const range = ref(10);
      return useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => warn,
        criticalThreshold: () => crit,
      });
    }

    it('returns sev-normal when below warning', () => {
      const d = makeWithThresholds(50, 80, 95);
      expect(d.valueSeverityClass.value).toBe('sev-normal');
    });

    it('returns sev-warning when ≥ warning but < critical', () => {
      const d = makeWithThresholds(85, 80, 95);
      expect(d.valueSeverityClass.value).toBe('sev-warning');
    });

    it('returns sev-critical when ≥ critical (takes precedence over warning)', () => {
      const d = makeWithThresholds(99, 80, 95);
      expect(d.valueSeverityClass.value).toBe('sev-critical');
    });

    it('returns sev-normal when both thresholds are undefined', () => {
      const d = makeWithThresholds(50);
      expect(d.valueSeverityClass.value).toBe('sev-normal');
    });

    it('returns empty string when there is no current value', () => {
      const data = ref<ProcessHistory | null>(null);
      const range = ref(10);
      const d = useTrendDerived({
        data: () => data.value,
        dataKey: () => 'cpu_history',
        selectedRange: range,
        warningThreshold: () => 80,
        criticalThreshold: () => 90,
      });
      expect(d.valueSeverityClass.value).toBe('');
    });
  });

  describe('formatVal', () => {
    it('formats finite numbers with one decimal', () => {
      const d = makeMinimal();
      expect(d.formatVal(0)).toBe('0.0');
      expect(d.formatVal(12.345)).toBe('12.3');
      expect(d.formatVal(-3.7)).toBe('-3.7');
    });

    it('returns -- for null/Infinity/NaN', () => {
      const d = makeMinimal();
      expect(d.formatVal(null)).toBe('--');
      expect(d.formatVal(Infinity)).toBe('--');
      expect(d.formatVal(-Infinity)).toBe('--');
      expect(d.formatVal(NaN)).toBe('--');
    });
  });
});

function makeMinimal() {
  const data = ref<ProcessHistory | null>(null);
  const range = ref(10);
  return useTrendDerived({
    data: () => data.value,
    dataKey: () => 'cpu_history',
    selectedRange: range,
    warningThreshold: () => undefined,
    criticalThreshold: () => undefined,
  });
}
