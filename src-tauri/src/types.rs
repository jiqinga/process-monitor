use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Metric {
    Cpu,
    Memory,
    ProcessState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum MemoryThresholdType {
    #[default]
    Percent,
    Mb,
}

impl std::fmt::Display for MemoryThresholdType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemoryThresholdType::Percent => write!(f, "Percent"),
            MemoryThresholdType::Mb => write!(f, "Mb"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ComparisonOp {
    Gt,
    Gte,
    Lt,
    Lte,
    Eq,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum Condition {
    #[serde(rename = "leaf")]
    Leaf {
        metric: Metric,
        threshold: f32,
        memory_threshold_type: MemoryThresholdType,
        comparison: ComparisonOp,
    },
    #[serde(rename = "and")]
    And(Vec<Condition>),
    #[serde(rename = "or")]
    Or(Vec<Condition>),
}

impl std::fmt::Display for Metric {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Metric::Cpu => write!(f, "Cpu"),
            Metric::Memory => write!(f, "Memory"),
            Metric::ProcessState => write!(f, "ProcessState"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TriggerMode {
    Auto,
    Prompt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandStep {
    pub cmd: String,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    KillProcess,
    StartProcess { cmd: String },
    RunCommand { steps: Vec<CommandStep> },
    ShowNotification { title: String, body: String },
    WriteLog,
}

impl Action {
    pub fn label(&self) -> String {
        match self {
            Action::KillProcess => "Kill Process".to_string(),
            Action::StartProcess { .. } => "Start Process".to_string(),
            Action::RunCommand { steps } => {
                let cmds: Vec<&str> = steps.iter().map(|s| s.cmd.as_str()).collect();
                format!("Run: {}", cmds.join(" | "))
            }
            Action::ShowNotification { title, .. } => format!("Notify: {}", title),
            Action::WriteLog => "Write Log".to_string(),
        }
    }

    pub fn action_type_name(&self) -> String {
        match self {
            Action::KillProcess => "KillProcess".to_string(),
            Action::StartProcess { .. } => "StartProcess".to_string(),
            Action::RunCommand { .. } => "RunCommand".to_string(),
            Action::ShowNotification { .. } => "ShowNotification".to_string(),
            Action::WriteLog => "WriteLog".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub process_name: String,
    pub metric: Metric,
    pub threshold: f32,
    pub memory_threshold_type: MemoryThresholdType,
    pub duration_secs: u64,
    pub cooldown_secs: u64,
    pub enabled: bool,
    pub trigger_mode: TriggerMode,
    pub actions: Vec<Action>,
    #[serde(default)]
    pub conditions: Option<Condition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub display_name: String,
    pub cpu_usage: f32,
    pub memory_mb: f32,
    pub memory_percent: f32,
    #[serde(default)]
    pub cmd: String,
    #[serde(default)]
    pub parent_pid: u32,
    #[serde(default)]
    pub user: String,
    #[serde(default)]
    pub start_time: String,
    #[serde(default)]
    pub threads: u32,
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessHistory {
    pub pid: u32,
    pub name: String,
    pub display_name: String,
    pub timestamps: Vec<i64>,
    pub cpu_history: Vec<f32>,
    pub memory_history: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleStatus {
    pub rule_id: String,
    pub process_name: String,
    pub metric: String,
    pub threshold: f32,
    pub current_value: f32,
    pub duration_secs: u64,
    pub elapsed_secs: u64,
    pub is_threshold_exceeded: bool,
    pub is_duration_met: bool,
    pub is_triggered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorUpdate {
    pub processes: Vec<ProcessInfo>,
    pub rule_statuses: Vec<RuleStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDetail {
    pub index: usize,
    pub label: String,
    pub action_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPromptPayload {
    pub rule_id: String,
    pub process_name: String,
    pub pid: u32,
    pub metric: String,
    pub value: f32,
    pub duration_secs: u64,
    pub available_actions: Vec<ActionDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionExecutedPayload {
    pub rule_id: String,
    pub action_type: String,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub rule_id: String,
    pub process_name: String,
    pub metric: String,
    pub value: f32,
    pub duration_secs: u64,
    pub action_type: String,
    pub result: String,
}

/// Tracks the state of a single rule monitoring a process
pub struct ProcessTracker {
    /// When the threshold was first exceeded
    pub threshold_start: Option<Instant>,
    /// When the action was last triggered
    pub last_triggered: Option<Instant>,
    /// PID of the tracked process
    pub pid: u32,
}

impl ProcessTracker {
    pub fn new(pid: u32) -> Self {
        Self {
            threshold_start: None,
            last_triggered: None,
            pid,
        }
    }

    /// Update the tracker with current threshold status.
    /// Returns true if duration condition is met.
    pub fn update(&mut self, is_exceeded: bool, duration_secs: u64) -> bool {
        if !is_exceeded {
            self.threshold_start = None;
            return false;
        }
        let start = *self.threshold_start.get_or_insert_with(Instant::now);
        start.elapsed().as_secs() >= duration_secs
    }

    /// Check if cooldown has passed since last trigger
    pub fn can_trigger(&self, cooldown_secs: u64) -> bool {
        match self.last_triggered {
            Some(last) => last.elapsed().as_secs() >= cooldown_secs,
            None => true,
        }
    }

    /// Mark that an action was triggered
    pub fn mark_triggered(&mut self) {
        self.last_triggered = Some(Instant::now());
    }

    /// Get elapsed seconds since threshold was first exceeded
    pub fn elapsed_secs(&self) -> u64 {
        match self.threshold_start {
            Some(start) => start.elapsed().as_secs(),
            None => 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub log_retention_days: u32,
    pub notification_position: String,
    pub notification_duration_ms: u64,
    #[serde(default = "default_page_size")]
    pub dashboard_page_size: u32,
    #[serde(default = "default_sort_field")]
    pub dashboard_sort_field: String,
    #[serde(default = "default_sort_order")]
    pub dashboard_sort_order: String,
    #[serde(default = "default_page_size")]
    pub rules_page_size: u32,
    #[serde(default = "default_page_size")]
    pub logs_page_size: u32,
    /// 开机自启时是否静默启动（不弹出主窗口，仅驻留托盘）。
    /// 仅在应用由自启项拉起（携带 `--minimized` 参数）时生效。
    #[serde(default)]
    pub start_minimized: bool,
}

fn default_page_size() -> u32 {
    20
}
fn default_sort_field() -> String {
    "cpu".to_string()
}
fn default_sort_order() -> String {
    "desc".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            log_retention_days: 30,
            notification_position: "bottom-right".to_string(),
            notification_duration_ms: 5000,
            dashboard_page_size: 20,
            dashboard_sort_field: "cpu".to_string(),
            dashboard_sort_order: "desc".to_string(),
            rules_page_size: 20,
            logs_page_size: 20,
            start_minimized: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPayload {
    pub title: String,
    pub body: String,
    pub position: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOverview {
    pub total_cpu_usage: f32,
    pub total_memory_usage: f32,
    pub total_memory_mb: f32,
    pub used_memory_mb: f32,
    pub process_count: u32,
    pub monitored_count: u32,
    pub triggered_count: u32,
}
