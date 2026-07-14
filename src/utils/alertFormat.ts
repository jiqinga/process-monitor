import type { ActionDetail } from '@/types';

export type MetricSeverity = 'severity-critical' | 'severity-warning' | 'severity-normal';

/** Translator signature compatible with vue-i18n's `t`. */
export type Translator = (key: string, params?: Record<string, unknown>) => string;

/**
 * Format a metric value for display in the alert window.
 * - `ProcessState`: returns localized "Running" / "Stopped" / "Unknown".
 * - `Memory`: returns `N.N MB`.
 * - Default (e.g. Cpu): returns `N.N%`.
 */
export function formatMetricValue(value: number, metric: string, t: Translator): string {
  if (metric.startsWith('ProcessState')) {
    if (value === 1) return t('detail.running');
    if (value === 0) return t('detail.stopped');
    return t('common.unknown');
  }
  if (metric === 'Memory') {
    return `${value.toFixed(1)} MB`;
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Map a metric reading to a severity class used by the alert UI.
 * Memory is always critical (it triggered the alert); CPU/others bucket by value.
 */
export function getMetricSeverityClass(value: number, metric: string): MetricSeverity {
  if (metric === 'Memory') return 'severity-critical';
  if (value >= 90) return 'severity-critical';
  if (value >= 75) return 'severity-warning';
  return 'severity-normal';
}

/** Localize an `ActionDetail.label` produced by the Rust backend. */
export function getActionLabel(action: ActionDetail, t: Translator): string {
  switch (action.action_type) {
    case 'KillProcess':
      return t('rules.killProcess');
    case 'StartProcess':
      return t('rules.startProcess');
    case 'RunCommand':
      return action.label.replace('Run: ', t('rules.runCommand') + ': ');
    case 'ShowNotification':
      return action.label.replace('Notify: ', t('rules.showNotification') + ': ');
    case 'WriteLog':
      return t('rules.writeLog');
    default:
      return action.label;
  }
}
