//! Process-name resolution and glob matching utilities.
//!
//! These are pure functions that other monitor sub-modules and the public
//! Tauri command surface rely on for matching rules to processes.

use std::collections::HashMap;

/// Resolve a friendly display name for a process.
/// For svchost.exe on Windows, uses the service_pid_map to find the actual service name.
pub fn resolve_display_name(
    proc_info: &sysinfo::Process,
    service_pid_map: &HashMap<u32, Vec<String>>,
) -> String {
    let name = proc_info.name().to_string_lossy().to_string();

    // For svchost.exe, look up the service display name from the Windows SCM
    if name.eq_ignore_ascii_case("svchost.exe") {
        let pid = proc_info.pid().as_u32();
        if let Some(services) = service_pid_map.get(&pid) {
            if !services.is_empty() {
                // Show the first service name (matching Task Manager behavior)
                let resolved = services[0].clone();
                log::debug!(
                    "[resolve_display_name] svchost PID {} -> '{}' (of {} total services: {:?})",
                    pid,
                    resolved,
                    services.len(),
                    services
                );
                return resolved;
            }
        }
        log::debug!(
            "[resolve_display_name] svchost PID {} -> no service found, using 'svchost.exe'",
            pid
        );
        return name;
    }

    let cmd = proc_info.cmd();
    if cmd.len() > 1 {
        let exe_path = &cmd[0];
        if let Some(stem) = std::path::Path::new(exe_path).file_stem() {
            return stem.to_string_lossy().to_string();
        }
    }

    name.replace(".exe", "").replace(".EXE", "")
}

/// Check if a process name matches a glob pattern.
pub fn matches_glob(pattern: &str, name: &str, display_name: &str) -> bool {
    let pattern_lower = pattern.to_lowercase();
    let name_lower = name.to_lowercase();
    let display_name_lower = display_name.to_lowercase();

    if let Ok(pat) = glob::Pattern::new(&pattern_lower) {
        if pat.matches(&name_lower) || pat.matches(&display_name_lower) {
            return true;
        }
    }

    name_lower.contains(&pattern_lower) || display_name_lower.contains(&pattern_lower)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_glob_literal_substring() {
        assert!(matches_glob("chrome", "chrome.exe", "Chrome"));
        assert!(matches_glob("CHROME", "chrome.exe", "Chrome"));
        assert!(!matches_glob("firefox", "chrome.exe", "Chrome"));
    }

    #[test]
    fn matches_glob_wildcard() {
        assert!(matches_glob("*.exe", "chrome.exe", "Chrome"));
        assert!(matches_glob("chr*", "chrome.exe", "Chrome"));
    }

    #[test]
    fn matches_glob_matches_display_name() {
        assert!(matches_glob("explorer", "svchost.exe", "Explorer"));
    }
}
