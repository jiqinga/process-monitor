use crate::error::{AppError, AppResult};
use crate::types::{AppSettings, LogEntry, Rule};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    pub rules: Vec<Rule>,
    #[serde(default)]
    pub settings: AppSettings,
    #[serde(default)]
    pub logs: Vec<LogEntry>,
}

pub struct ConfigManager {
    path: PathBuf,
    pub config: Mutex<Config>,
}

const LOG_CAP: usize = 10_000;

impl ConfigManager {
    pub fn new() -> Self {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("process-monitor");

        if let Err(e) = fs::create_dir_all(&data_dir) {
            log::warn!("Failed to create data dir {:?}: {}", data_dir, e);
        }

        let config_path = data_dir.join("config.json");
        let mut config = Self::load_config(&config_path);
        Self::cleanup_old_logs(&mut config);

        Self {
            path: config_path,
            config: Mutex::new(config),
        }
    }

    /// Construct a ConfigManager backed by a specific file path (useful for tests).
    #[cfg(test)]
    pub fn with_path(path: PathBuf) -> Self {
        let mut config = Self::load_config(&path);
        Self::cleanup_old_logs(&mut config);
        Self {
            path,
            config: Mutex::new(config),
        }
    }

    fn load_config(path: &PathBuf) -> Config {
        if !path.exists() {
            return Config::default();
        }
        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|e| {
                log::warn!("Failed to parse config {:?}: {} — using defaults", path, e);
                Config::default()
            }),
            Err(e) => {
                log::warn!("Failed to read config {:?}: {} — using defaults", path, e);
                Config::default()
            }
        }
    }

    pub(crate) fn cleanup_old_logs(config: &mut Config) {
        let retention_days = config.settings.log_retention_days as i64;
        let cutoff = chrono::Local::now() - chrono::Duration::days(retention_days);
        let cutoff_str = cutoff.format("%Y-%m-%d %H:%M:%S").to_string();
        config.logs.retain(|log| log.timestamp >= cutoff_str);
    }

    pub fn save(&self) -> AppResult<()> {
        let config = self.config.lock().map_err(AppError::lock_from)?;
        let json = serde_json::to_string_pretty(&*config)?;
        fs::write(&self.path, json)?;
        Ok(())
    }

    pub fn get_rules(&self) -> AppResult<Vec<Rule>> {
        let config = self.config.lock().map_err(AppError::lock_from)?;
        Ok(config.rules.clone())
    }

    pub fn save_rule(&self, rule: Rule) -> AppResult<()> {
        {
            let mut config = self.config.lock().map_err(AppError::lock_from)?;
            if let Some(existing) = config.rules.iter_mut().find(|r| r.id == rule.id) {
                *existing = rule;
            } else {
                config.rules.push(rule);
            }
        }
        self.save()
    }

    pub fn delete_rule(&self, id: &str) -> AppResult<()> {
        {
            let mut config = self.config.lock().map_err(AppError::lock_from)?;
            config.rules.retain(|r| r.id != id);
        }
        self.save()
    }

    pub fn toggle_rule(&self, id: &str, enabled: bool) -> AppResult<()> {
        {
            let mut config = self.config.lock().map_err(AppError::lock_from)?;
            if let Some(rule) = config.rules.iter_mut().find(|r| r.id == id) {
                rule.enabled = enabled;
            }
        }
        self.save()
    }

    pub fn add_log(&self, entry: LogEntry) -> AppResult<()> {
        {
            let mut config = self.config.lock().map_err(AppError::lock_from)?;
            config.logs.insert(0, entry);
            config.logs.truncate(LOG_CAP);
        }
        self.save()
    }

    pub fn get_logs(&self) -> AppResult<Vec<LogEntry>> {
        let config = self.config.lock().map_err(AppError::lock_from)?;
        Ok(config.logs.clone())
    }

    pub fn get_settings(&self) -> AppResult<AppSettings> {
        let config = self.config.lock().map_err(AppError::lock_from)?;
        Ok(config.settings.clone())
    }

    pub fn save_settings(&self, settings: AppSettings) -> AppResult<()> {
        {
            let mut config = self.config.lock().map_err(AppError::lock_from)?;
            config.settings = settings;
        }
        self.save()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Action, MemoryThresholdType, Metric, Rule, TriggerMode};
    use tempfile::TempDir;

    fn make_rule(id: &str) -> Rule {
        Rule {
            id: id.to_string(),
            process_name: "*".to_string(),
            metric: Metric::Cpu,
            threshold: 50.0,
            memory_threshold_type: MemoryThresholdType::Percent,
            duration_secs: 10,
            cooldown_secs: 30,
            enabled: true,
            trigger_mode: TriggerMode::Auto,
            actions: vec![Action::WriteLog],
            conditions: None,
        }
    }

    fn make_log(ts: &str) -> LogEntry {
        LogEntry {
            timestamp: ts.to_string(),
            rule_id: "r1".to_string(),
            process_name: "p".to_string(),
            metric: "Cpu".to_string(),
            value: 0.0,
            duration_secs: 0,
            action_type: "WriteLog".to_string(),
            result: "ok".to_string(),
        }
    }

    fn temp_manager() -> (ConfigManager, TempDir) {
        let dir = TempDir::new().expect("tempdir");
        let path = dir.path().join("config.json");
        (ConfigManager::with_path(path), dir)
    }

    #[test]
    fn save_rule_inserts_new() {
        let (mgr, _g) = temp_manager();
        mgr.save_rule(make_rule("r1")).unwrap();
        let rules = mgr.get_rules().unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].id, "r1");
    }

    #[test]
    fn save_rule_updates_existing() {
        let (mgr, _g) = temp_manager();
        mgr.save_rule(make_rule("r1")).unwrap();
        let mut updated = make_rule("r1");
        updated.threshold = 99.0;
        mgr.save_rule(updated).unwrap();
        let rules = mgr.get_rules().unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].threshold, 99.0);
    }

    #[test]
    fn delete_rule_removes_only_target() {
        let (mgr, _g) = temp_manager();
        mgr.save_rule(make_rule("r1")).unwrap();
        mgr.save_rule(make_rule("r2")).unwrap();
        mgr.delete_rule("r1").unwrap();
        let rules = mgr.get_rules().unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].id, "r2");
    }

    #[test]
    fn toggle_rule_flips_enabled() {
        let (mgr, _g) = temp_manager();
        mgr.save_rule(make_rule("r1")).unwrap();
        mgr.toggle_rule("r1", false).unwrap();
        assert!(!mgr.get_rules().unwrap()[0].enabled);
        mgr.toggle_rule("r1", true).unwrap();
        assert!(mgr.get_rules().unwrap()[0].enabled);
    }

    #[test]
    fn add_log_truncates_to_cap() {
        // Pre-fill the in-memory log buffer to (LOG_CAP - 1) without touching disk,
        // so a single add_log call exercises the truncation path with one IO.
        let (mgr, _g) = temp_manager();
        {
            let mut cfg = mgr.config.lock().unwrap();
            for i in 0..(LOG_CAP - 1) {
                let ts = format!("2026-05-{:02} 10:00:{:02}", (i % 28) + 1, i % 60);
                cfg.logs.push(make_log(&ts));
            }
        }
        // Two pushes through add_log: first reaches LOG_CAP, second forces truncation.
        mgr.add_log(make_log("2026-05-21 11:00:00")).unwrap();
        mgr.add_log(make_log("2026-05-21 11:00:01")).unwrap();
        let logs = mgr.get_logs().unwrap();
        assert_eq!(logs.len(), LOG_CAP);
        // Newest first
        assert_eq!(logs[0].timestamp, "2026-05-21 11:00:01");
    }

    #[test]
    fn cleanup_old_logs_drops_expired() {
        let mut cfg = Config::default();
        cfg.settings.log_retention_days = 1;
        let old_ts = (chrono::Local::now() - chrono::Duration::days(10))
            .format("%Y-%m-%d %H:%M:%S")
            .to_string();
        let fresh_ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        cfg.logs.push(make_log(&old_ts));
        cfg.logs.push(make_log(&fresh_ts));
        ConfigManager::cleanup_old_logs(&mut cfg);
        assert_eq!(cfg.logs.len(), 1);
        assert_eq!(cfg.logs[0].timestamp, fresh_ts);
    }

    #[test]
    fn save_settings_persists_across_reload() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.json");
        {
            let mgr = ConfigManager::with_path(path.clone());
            let s = AppSettings {
                log_retention_days: 7,
                notification_position: "top-left".to_string(),
                ..Default::default()
            };
            mgr.save_settings(s).unwrap();
        }
        let mgr2 = ConfigManager::with_path(path);
        let s = mgr2.get_settings().unwrap();
        assert_eq!(s.log_retention_days, 7);
        assert_eq!(s.notification_position, "top-left");
    }
}
