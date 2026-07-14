//! Build a [`ProcessInfo`] snapshot from a `sysinfo::Process`.
//!
//! Extracted so the monitor `tick` loop reads at a single layer of
//! abstraction (collect → evaluate → dispatch).

use crate::monitor::name_resolve::resolve_display_name;
use crate::types::ProcessInfo;
use std::collections::HashMap;
use sysinfo::{Pid, Process};

/// Compose a [`ProcessInfo`] for one process. `num_cpus` and `total_memory_mb`
/// are passed in so callers can compute them once per tick rather than
/// per-process.
pub(super) fn build_process_info(
    pid: &Pid,
    proc_info: &Process,
    num_cpus: f32,
    total_memory_mb: f32,
    service_pid_map: &HashMap<u32, Vec<String>>,
) -> ProcessInfo {
    let name = proc_info.name().to_string_lossy().to_string();
    let display_name = resolve_display_name(proc_info, service_pid_map);
    let mem_mb = proc_info.memory() as f32 / 1024.0 / 1024.0;
    let memory_percent = if total_memory_mb > 0.0 {
        mem_mb / total_memory_mb * 100.0
    } else {
        0.0
    };
    let cmd = proc_info
        .cmd()
        .iter()
        .map(|s| s.to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(" ");

    ProcessInfo {
        pid: pid.as_u32(),
        name,
        display_name,
        cpu_usage: proc_info.cpu_usage() / num_cpus,
        memory_mb: mem_mb,
        memory_percent,
        cmd,
        parent_pid: proc_info.parent().map(|p| p.as_u32()).unwrap_or(0),
        user: proc_info
            .user_id()
            .map(|u| u.to_string())
            .unwrap_or_default(),
        start_time: String::new(),
        threads: 0,
        status: String::new(),
    }
}
