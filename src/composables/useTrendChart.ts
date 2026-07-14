import { shallowRef, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue';
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type LineData,
  type UTCTimestamp,
  type DeepPartial,
  type ChartOptions,
} from 'lightweight-charts';
import type { ProcessHistory } from '@/types';

export interface ReferenceLineDef {
  value: number;
  label?: string;
  color?: string;
}

type Slice = { ts: number[]; vals: number[] } | null;

interface ChartDeps {
  container: Ref<HTMLElement | null>;
  data: () => ProcessHistory | null;
  dataKey: () => 'cpu_history' | 'memory_history';
  color: () => string;
  compact: () => boolean;
  referenceLine: () => ReferenceLineDef | undefined;
  selectedRange: Ref<number>;
  slice: ComputedRef<Slice>;
  thresholdLabelFallback: () => string;
}

/**
 * Encapsulate the lightweight-charts lifecycle for one trend card:
 * mount, theme/responsive observers, incremental + full data sync,
 * price (reference) line, teardown.
 */
export function useTrendChart(deps: ChartDeps) {
  let chart: IChartApi | null = null;
  let lineSeries: ISeriesApi<'Line'> | null = null;
  let priceLine: IPriceLine | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let themeObserver: MutationObserver | null = null;
  const lastSentTs = shallowRef<number | null>(null);
  const lastDataIdentity = shallowRef<{ name: string; pid: number; range: number } | null>(null);

  function isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  function buildChartOptions(isDark: boolean, width: number): DeepPartial<ChartOptions> {
    return {
      width,
      height: deps.compact() ? 120 : 200,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#94a3b8' : '#64748b',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.6)' },
        horzLines: { color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.6)' },
      },
      crosshair: {
        vertLine: {
          color: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: deps.color(),
        },
        horzLine: {
          color: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: deps.color(),
        },
        mode: 0,
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.8)',
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.8)',
        timeVisible: true,
        secondsVisible: deps.selectedRange.value <= 150,
        rightOffset: 3,
        barSpacing: 6,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: false },
    };
  }

  function applyPriceLine() {
    if (!lineSeries) return;
    if (priceLine) {
      lineSeries.removePriceLine(priceLine);
      priceLine = null;
    }
    const ref = deps.referenceLine();
    if (ref) {
      priceLine = lineSeries.createPriceLine({
        price: ref.value,
        color: ref.color ?? '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ref.label ?? deps.thresholdLabelFallback(),
      });
    }
  }

  function dataIdentity() {
    const data = deps.data();
    if (!data) return null;
    return { name: data.name, pid: data.pid, range: deps.selectedRange.value };
  }

  function sameIdentity(): boolean {
    const a = lastDataIdentity.value;
    const b = dataIdentity();
    return !!a && !!b && a.name === b.name && a.pid === b.pid && a.range === b.range;
  }

  function reloadFull() {
    if (!lineSeries) return;
    const s = deps.slice.value;
    if (!s || !s.vals.length) {
      lineSeries.setData([]);
      lastSentTs.value = null;
      lastDataIdentity.value = dataIdentity();
      return;
    }
    const points: LineData[] = [];
    let lastTs = -Infinity;
    for (let i = 0; i < s.ts.length; i++) {
      const ts = Number(s.ts[i]);
      if (!Number.isFinite(ts) || ts <= lastTs) continue;
      points.push({ time: ts as UTCTimestamp, value: s.vals[i] });
      lastTs = ts;
    }
    lineSeries.setData(points);
    lastSentTs.value = points.length ? (points[points.length - 1].time as number) : null;
    lastDataIdentity.value = dataIdentity();
    if (chart) chart.timeScale().fitContent();
  }

  function appendIncremental() {
    if (!lineSeries) return;
    const data = deps.data();
    if (!data) return;
    const ts = data.timestamps;
    const vals = data[deps.dataKey()];
    if (!ts.length) return;
    const cutoff = lastSentTs.value ?? -Infinity;
    let i = ts.length - 1;
    while (i >= 0 && Number(ts[i]) > cutoff) i--;
    for (let j = i + 1; j < ts.length; j++) {
      const t = Number(ts[j]);
      if (!Number.isFinite(t)) continue;
      lineSeries.update({ time: t as UTCTimestamp, value: vals[j] });
      lastSentTs.value = t;
    }
  }

  function initChart() {
    if (!deps.container.value) return;
    const container = deps.container.value;
    const opts = buildChartOptions(isDarkMode(), container.clientWidth);
    chart = createChart(container, opts);
    lineSeries = chart.addLineSeries({
      color: deps.color(),
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: deps.color(),
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBorderWidth: 2,
      lastValueVisible: true,
      priceLineVisible: false,
    });
    applyPriceLine();
    reloadFull();
  }

  function destroyChart() {
    if (chart) {
      chart.remove();
      chart = null;
      lineSeries = null;
      priceLine = null;
    }
  }

  watch(
    () => deps.data(),
    () => {
      if (!lineSeries) return;
      if (sameIdentity()) {
        appendIncremental();
      } else {
        reloadFull();
      }
    },
  );

  watch(deps.selectedRange, () => {
    if (!chart || !lineSeries) return;
    chart.applyOptions({ timeScale: { secondsVisible: deps.selectedRange.value <= 150 } });
    reloadFull();
  });

  watch(
    () => deps.color(),
    (newColor) => {
      if (lineSeries && newColor) {
        lineSeries.applyOptions({
          color: newColor,
          crosshairMarkerBackgroundColor: newColor,
        });
      }
    },
  );

  watch(() => deps.referenceLine(), () => applyPriceLine(), { deep: true });

  onMounted(() => {
    initChart();

    if (deps.container.value && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        if (chart && deps.container.value) {
          chart.applyOptions({ width: deps.container.value.clientWidth });
        }
      });
      resizeObserver.observe(deps.container.value);
    }

    themeObserver = new MutationObserver(() => {
      if (!chart || !deps.container.value) return;
      chart.applyOptions(buildChartOptions(isDarkMode(), deps.container.value.clientWidth));
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    destroyChart();
  });
}
