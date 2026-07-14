//! Per-process history (CPU/memory time series) used by trend charts.
//!
//! Lives outside `mod.rs` so the engine's tick loop reads at one layer
//! of abstraction. Keyed by lowercased process name so history survives
//! PID changes across restarts. Trims to [`MAX_HISTORY_POINTS`] per process.

use crate::error::{AppError, AppResult};
use crate::monitor::MonitorEngine;
use crate::types::{ProcessHistory, ProcessInfo};
use std::collections::{HashMap, HashSet};

/// History capacity per process: 1 h @ 2 s tick — covers the longest
/// range option exposed in the trend-chart UI.
const MAX_HISTORY_POINTS: usize = 1800;

impl MonitorEngine {
    /// Aggregate this tick's processes by lowercased name and append to history.
    /// Called from the engine tick loop.
    pub(super) fn record_history(&self, processes: &[ProcessInfo]) -> AppResult<()> {
        let mut history = self.history.lock().map_err(AppError::lock_from)?;
        let now = chrono::Local::now().timestamp();

        // Aggregate this tick by lowercased name.
        let mut tick_agg: HashMap<String, (String, String, u32, f32, f32)> = HashMap::new();
        for proc in processes {
            let key = proc.name.to_lowercase();
            let entry = tick_agg.entry(key).or_insert_with(|| {
                (
                    proc.name.clone(),
                    proc.display_name.clone(),
                    proc.pid,
                    0.0,
                    0.0,
                )
            });
            entry.3 += proc.cpu_usage;
            entry.4 += proc.memory_mb;
        }

        let mut active_keys: HashSet<String> = HashSet::new();
        for (key, (name, display_name, pid, cpu, mem)) in tick_agg {
            active_keys.insert(key.clone());
            let entry = history.entry(key).or_insert_with(|| ProcessHistory {
                pid,
                name: name.clone(),
                display_name: display_name.clone(),
                timestamps: Vec::new(),
                cpu_history: Vec::new(),
                memory_history: Vec::new(),
            });
            // Refresh identity in case display-name resolution changed.
            entry.pid = pid;
            entry.display_name = display_name;
            entry.timestamps.push(now);
            entry.cpu_history.push(cpu);
            entry.memory_history.push(mem);

            if entry.timestamps.len() > MAX_HISTORY_POINTS {
                let excess = entry.timestamps.len() - MAX_HISTORY_POINTS;
                entry.timestamps.drain(0..excess);
                entry.cpu_history.drain(0..excess);
                entry.memory_history.drain(0..excess);
            }
        }

        // Drop history entries whose process is no longer present this tick.
        history.retain(|key, _| active_keys.contains(key));
        Ok(())
    }

    /// Look up history for a process by lowercased `name` or `display_name`.
    pub fn get_process_history(&self, process_name: &str) -> AppResult<Option<ProcessHistory>> {
        let history = self.history.lock().map_err(AppError::lock_from)?;
        let target = process_name.to_lowercase();
        let result = history
            .values()
            .find(|h| h.name.to_lowercase() == target || h.display_name.to_lowercase() == target)
            .cloned();
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ConfigManager;
    use std::sync::Arc;
    use tempfile::TempDir;

    fn make_engine() -> (MonitorEngine, TempDir) {
        let dir = TempDir::new().expect("tempdir");
        let mgr = ConfigManager::with_path(dir.path().to_path_buf());
        let engine = MonitorEngine::new(Arc::new(mgr));
        (engine, dir)
    }

    fn make_proc(pid: u32, name: &str, display: &str, cpu: f32, mem_mb: f32) -> ProcessInfo {
        ProcessInfo {
            pid,
            name: name.to_string(),
            display_name: display.to_string(),
            cpu_usage: cpu,
            memory_mb: mem_mb,
            memory_percent: 0.0,
            cmd: String::new(),
            parent_pid: 0,
            user: String::new(),
            start_time: String::new(),
            threads: 0,
            status: String::new(),
        }
    }

    #[test]
    fn appends_one_data_point_per_tick() {
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[make_proc(1, "chrome.exe", "Chrome", 12.5, 256.0)])
            .unwrap();

        let history = engine.history.lock().unwrap();
        let entry = history.get("chrome.exe").expect("chrome.exe entry");
        assert_eq!(entry.name, "chrome.exe");
        assert_eq!(entry.display_name, "Chrome");
        assert_eq!(entry.pid, 1);
        assert_eq!(entry.cpu_history, vec![12.5]);
        assert_eq!(entry.memory_history, vec![256.0]);
        assert_eq!(entry.timestamps.len(), 1);
    }

    #[test]
    fn aggregates_same_name_across_pids_within_a_tick() {
        // Three Chrome workers — record_history should sum cpu + mem per tick.
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[
                make_proc(1, "chrome.exe", "Chrome", 10.0, 100.0),
                make_proc(2, "chrome.exe", "Chrome", 5.0, 50.0),
                make_proc(3, "chrome.exe", "Chrome", 2.5, 25.0),
            ])
            .unwrap();

        let history = engine.history.lock().unwrap();
        let entry = history.get("chrome.exe").unwrap();
        assert_eq!(entry.cpu_history, vec![17.5]);
        assert_eq!(entry.memory_history, vec![175.0]);
    }

    #[test]
    fn lowercases_key_so_case_variants_merge() {
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[
                make_proc(1, "Chrome.exe", "Chrome", 10.0, 100.0),
                make_proc(2, "CHROME.EXE", "Chrome", 5.0, 50.0),
            ])
            .unwrap();

        let history = engine.history.lock().unwrap();
        assert_eq!(history.len(), 1);
        let entry = history.values().next().unwrap();
        assert_eq!(entry.cpu_history, vec![15.0]);
    }

    #[test]
    fn multiple_ticks_accumulate_into_the_same_entry() {
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[make_proc(1, "app.exe", "App", 10.0, 100.0)])
            .unwrap();
        engine
            .record_history(&[make_proc(1, "app.exe", "App", 20.0, 200.0)])
            .unwrap();
        engine
            .record_history(&[make_proc(1, "app.exe", "App", 30.0, 300.0)])
            .unwrap();

        let history = engine.history.lock().unwrap();
        let entry = history.get("app.exe").unwrap();
        assert_eq!(entry.cpu_history, vec![10.0, 20.0, 30.0]);
        assert_eq!(entry.memory_history, vec![100.0, 200.0, 300.0]);
        assert_eq!(entry.timestamps.len(), 3);
    }

    #[test]
    fn drops_entries_absent_from_current_tick() {
        let (engine, _dir) = make_engine();
        // tick 1: A + B
        engine
            .record_history(&[
                make_proc(1, "a.exe", "A", 1.0, 1.0),
                make_proc(2, "b.exe", "B", 2.0, 2.0),
            ])
            .unwrap();
        // tick 2: only A — B should disappear
        engine
            .record_history(&[make_proc(1, "a.exe", "A", 5.0, 5.0)])
            .unwrap();

        let history = engine.history.lock().unwrap();
        assert!(history.contains_key("a.exe"));
        assert!(!history.contains_key("b.exe"));
    }

    #[test]
    fn refreshes_pid_and_display_name_each_tick() {
        // When a process restarts with a new PID or its display name changes
        // (e.g. svchost service-name resolution), the entry should reflect
        // the latest tick's identity.
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[make_proc(1, "svc.exe", "OldName", 1.0, 1.0)])
            .unwrap();
        engine
            .record_history(&[make_proc(99, "svc.exe", "NewName", 2.0, 2.0)])
            .unwrap();

        let history = engine.history.lock().unwrap();
        let entry = history.get("svc.exe").unwrap();
        assert_eq!(entry.pid, 99);
        assert_eq!(entry.display_name, "NewName");
        // History is preserved across the PID change.
        assert_eq!(entry.cpu_history.len(), 2);
    }

    #[test]
    fn get_process_history_matches_by_lowercased_name_or_display() {
        let (engine, _dir) = make_engine();
        engine
            .record_history(&[make_proc(1, "chrome.exe", "Google Chrome", 10.0, 100.0)])
            .unwrap();

        let by_name = engine.get_process_history("CHROME.exe").unwrap();
        assert!(by_name.is_some());

        let by_display = engine.get_process_history("google chrome").unwrap();
        assert!(by_display.is_some());

        let miss = engine.get_process_history("nothing").unwrap();
        assert!(miss.is_none());
    }
}
