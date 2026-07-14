import { describe, expect, it } from 'vitest';
import {
  formatMetricValue,
  getActionLabel,
  getMetricSeverityClass,
  type Translator,
} from '../alertFormat';
import type { ActionDetail } from '@/types';

/** Identity-style translator: returns the key so tests can assert against it. */
const echoT: Translator = (key) => key;

describe('formatMetricValue', () => {
  it('formats CPU as percentage with one decimal', () => {
    expect(formatMetricValue(87.456, 'Cpu', echoT)).toBe('87.5%');
    expect(formatMetricValue(0, 'Cpu', echoT)).toBe('0.0%');
  });

  it('formats Memory as MB with one decimal', () => {
    expect(formatMetricValue(512, 'Memory', echoT)).toBe('512.0 MB');
    expect(formatMetricValue(1234.567, 'Memory', echoT)).toBe('1234.6 MB');
  });

  it('maps ProcessState(...) value 1 → detail.running', () => {
    expect(formatMetricValue(1, 'ProcessState(Running)', echoT)).toBe('detail.running');
  });

  it('maps ProcessState(...) value 0 → detail.stopped', () => {
    expect(formatMetricValue(0, 'ProcessState(Stopped)', echoT)).toBe('detail.stopped');
  });

  it('maps other ProcessState(...) values → common.unknown', () => {
    expect(formatMetricValue(0.5, 'ProcessState(Anything)', echoT)).toBe('common.unknown');
  });

  it('treats unknown metrics as percentage (default branch)', () => {
    expect(formatMetricValue(42.1, 'Disk', echoT)).toBe('42.1%');
  });
});

describe('getMetricSeverityClass', () => {
  it('Memory is always critical regardless of value', () => {
    expect(getMetricSeverityClass(1, 'Memory')).toBe('severity-critical');
    expect(getMetricSeverityClass(99999, 'Memory')).toBe('severity-critical');
  });

  it('CPU ≥ 90 → critical', () => {
    expect(getMetricSeverityClass(90, 'Cpu')).toBe('severity-critical');
    expect(getMetricSeverityClass(95.5, 'Cpu')).toBe('severity-critical');
  });

  it('CPU in [75, 90) → warning', () => {
    expect(getMetricSeverityClass(75, 'Cpu')).toBe('severity-warning');
    expect(getMetricSeverityClass(89.9, 'Cpu')).toBe('severity-warning');
  });

  it('CPU < 75 → normal', () => {
    expect(getMetricSeverityClass(74.9, 'Cpu')).toBe('severity-normal');
    expect(getMetricSeverityClass(0, 'Cpu')).toBe('severity-normal');
  });
});

describe('getActionLabel', () => {
  function action(action_type: ActionDetail['action_type'], label: string): ActionDetail {
    return { index: 0, label, action_type };
  }

  it('KillProcess → rules.killProcess', () => {
    expect(getActionLabel(action('KillProcess', 'Kill'), echoT)).toBe('rules.killProcess');
  });

  it('StartProcess → rules.startProcess', () => {
    expect(getActionLabel(action('StartProcess', 'Start'), echoT)).toBe('rules.startProcess');
  });

  it('WriteLog → rules.writeLog', () => {
    expect(getActionLabel(action('WriteLog', 'Log'), echoT)).toBe('rules.writeLog');
  });

  it('RunCommand replaces "Run: " prefix with localized label', () => {
    expect(getActionLabel(action('RunCommand', 'Run: cleanup.sh'), echoT)).toBe(
      'rules.runCommand: cleanup.sh',
    );
  });

  it('ShowNotification replaces "Notify: " prefix with localized label', () => {
    expect(getActionLabel(action('ShowNotification', 'Notify: hi'), echoT)).toBe(
      'rules.showNotification: hi',
    );
  });

  it('unknown action_type falls back to the raw label', () => {
    // Cast through unknown to model a backend that emits a new variant the UI
    // hasn't been updated for yet — graceful degradation.
    const unknown = {
      index: 0,
      label: 'mystery',
      action_type: 'NewKind',
    } as unknown as ActionDetail;
    expect(getActionLabel(unknown, echoT)).toBe('mystery');
  });
});
