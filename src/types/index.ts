export interface ConditionLeaf {
  type: 'leaf';
  metric: 'Cpu' | 'Memory' | 'ProcessState';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
  comparison: 'Gt' | 'Gte' | 'Lt' | 'Lte' | 'Eq';
}

export interface ConditionGroup {
  type: 'and' | 'or';
  conditions: Condition[];
}

export type Condition = ConditionLeaf | ConditionGroup;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Rule {
  id: string;
  process_name: string;
  metric: 'Cpu' | 'Memory' | 'ProcessState';
  threshold: number;
  memory_threshold_type: 'Percent' | 'Mb';
  duration_secs: number;
  cooldown_secs: number;
  enabled: boolean;
  trigger_mode: 'Auto' | 'Prompt';
  actions: Action[];
  conditions?: Condition;
}

export interface AppSettings {
  log_retention_days: number;
  notification_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  notification_duration_ms: number;
  dashboard_page_size: number;
  dashboard_sort_field: 'pid' | 'name' | 'cpu' | 'memory' | 'status';
  dashboard_sort_order: 'asc' | 'desc';
  rules_page_size: number;
  logs_page_size: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  position: string;
  duration_ms: number;
}

export interface CommandStep {
  cmd: string;
  delay_ms: number;
}

export type ActionType =
  | 'KillProcess'
  | { StartProcess: { cmd: string } }
  | { RunCommand: { steps: CommandStep[] } }
  | { ShowNotification: { title: string; body: string } }
  | 'WriteLog';

export type Action = ActionType;

export type KillProcessAction = 'KillProcess';
export type WriteLogAction = 'WriteLog';
export type StartProcessAction = { StartProcess: { cmd: string } };
export type RunCommandAction = { RunCommand: { steps: CommandStep[] } };
export type ShowNotificationAction = { ShowNotification: { title: string; body: string } };

/**
 * Type guards aligned with Rust's externally tagged enum serialization
 * (`enum Action { KillProcess, StartProcess { cmd }, ... }`).
 */
export function isKillProcess(a: Action): a is KillProcessAction {
  return a === 'KillProcess';
}

export function isWriteLog(a: Action): a is WriteLogAction {
  return a === 'WriteLog';
}

export function isStartProcess(a: Action): a is StartProcessAction {
  return typeof a === 'object' && a !== null && 'StartProcess' in a;
}

export function isRunCommand(a: Action): a is RunCommandAction {
  return typeof a === 'object' && a !== null && 'RunCommand' in a;
}

export function isShowNotification(a: Action): a is ShowNotificationAction {
  return typeof a === 'object' && a !== null && 'ShowNotification' in a;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  display_name: string;
  cpu_usage: number;
  memory_mb: number;
  memory_percent: number;
  cmd: string;
  parent_pid: number;
  user: string;
  start_time: string;
  threads: number;
  status: string;
}

export interface ProcessHistory {
  pid: number;
  name: string;
  display_name: string;
  timestamps: number[];
  cpu_history: number[];
  memory_history: number[];
}

export interface SystemOverview {
  total_cpu_usage: number;
  total_memory_usage: number;
  total_memory_mb: number;
  used_memory_mb: number;
  process_count: number;
  monitored_count: number;
  triggered_count: number;
}

export interface RuleStatus {
  rule_id: string;
  process_name: string;
  metric: string;
  threshold: number;
  current_value: number;
  duration_secs: number;
  elapsed_secs: number;
  is_threshold_exceeded: boolean;
  is_duration_met: boolean;
  is_triggered: boolean;
}

export interface MonitorUpdate {
  processes: ProcessInfo[];
  rule_statuses: RuleStatus[];
}

export interface ActionPromptPayload {
  rule_id: string;
  process_name: string;
  pid: number;
  metric: string;
  value: number;
  duration_secs: number;
  available_actions: ActionDetail[];
}

export interface ActionDetail {
  index: number;
  label: string;
  action_type: string;
}

export interface ActionExecutedPayload {
  rule_id: string;
  action_type: string;
  success: boolean;
  message: string;
}

export interface LogEntry {
  timestamp: string;
  rule_id: string;
  process_name: string;
  metric: string;
  value: number;
  duration_secs: number;
  action_type: string;
  result: string;
}
