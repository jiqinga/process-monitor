/**
 * Shared types for the rule-form subtree. Kept in one tiny file so the
 * three rule-form components agree on shape without one importing another.
 */

export interface RuleFormState {
  process_name: string;
  metric: 'Cpu' | 'Memory' | 'ProcessState';
  memory_threshold_type: 'Percent' | 'Mb';
  threshold: number;
  duration_secs: number;
  cooldown_secs: number;
  trigger_mode: 'Auto' | 'Prompt';
}

export interface ConditionRow {
  metric: 'Cpu' | 'Memory';
  comparison: 'Gt' | 'Gte' | 'Lt' | 'Lte' | 'Eq';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
  logic: 'and' | 'or';
}

export interface CommandStep {
  cmd: string;
  delayMs: number;
}

export interface ActionFlagsState {
  killProcess: boolean;
  startProcess: boolean;
  startCmd: string;
  runCommand: boolean;
  commandSteps: CommandStep[];
  showNotification: boolean;
  writeLog: boolean;
}
