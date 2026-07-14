import { computed, type Ref } from 'vue';
import type { ProcessHistory } from '@/types';

interface DerivedDeps {
  data: () => ProcessHistory | null;
  dataKey: () => 'cpu_history' | 'memory_history';
  selectedRange: Ref<number>;
  warningThreshold: () => number | undefined;
  criticalThreshold: () => number | undefined;
}

/** Pure (DOM-free) derivations driving the trend-chart header UI. */
export function useTrendDerived(deps: DerivedDeps) {
  const slice = computed(() => {
    const data = deps.data();
    if (!data) return null;
    const ts = data.timestamps;
    const vals = data[deps.dataKey()];
    const start = Math.max(0, ts.length - deps.selectedRange.value);
    return { ts: ts.slice(start), vals: vals.slice(start) };
  });

  const hasData = computed(() => !!slice.value && slice.value.vals.length > 0);

  const currentValue = computed<number | null>(() => {
    const s = slice.value;
    if (!s || !s.vals.length) return null;
    return s.vals[s.vals.length - 1];
  });

  const stats = computed(() => {
    const s = slice.value;
    if (!s || !s.vals.length) return null;
    let mn = Infinity;
    let mx = -Infinity;
    let sum = 0;
    let peakIdx = 0;
    for (let i = 0; i < s.vals.length; i++) {
      const v = s.vals[i];
      if (v < mn) mn = v;
      if (v > mx) {
        mx = v;
        peakIdx = i;
      }
      sum += v;
    }
    return {
      min: mn,
      max: mx,
      avg: sum / s.vals.length,
      peakTimeStr: formatTime(s.ts[peakIdx]),
    };
  });

  const valueSeverityClass = computed(() => {
    const v = currentValue.value;
    if (v == null) return '';
    const crit = deps.criticalThreshold();
    const warn = deps.warningThreshold();
    if (crit != null && v >= crit) return 'sev-critical';
    if (warn != null && v >= warn) return 'sev-warning';
    return 'sev-normal';
  });

  return {
    slice,
    hasData,
    currentValue,
    stats,
    valueSeverityClass,
    formatVal,
    formatTime,
  };
}

function formatVal(v: number | null): string {
  if (v == null || !isFinite(v)) return '--';
  return v.toFixed(1);
}

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
