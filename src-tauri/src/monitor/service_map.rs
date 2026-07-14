//! Windows Service Control Manager → PID mapping.
//!
//! Used to resolve `svchost.exe` instances back to the service display name
//! shown by Task Manager. Non-Windows targets get a no-op fallback so the
//! caller code remains platform-agnostic.

use std::collections::HashMap;

/// Build a map from PID to a list of Windows service display names.
/// Uses the Windows Service Control Manager API (EnumServicesStatusExW).
#[cfg(target_os = "windows")]
pub fn build_service_pid_map() -> HashMap<u32, Vec<String>> {
    use std::ptr;
    use windows_sys::Win32::System::Services::{
        CloseServiceHandle, EnumServicesStatusExW, OpenSCManagerW, ENUM_SERVICE_STATUS_PROCESSW,
        SC_HANDLE, SC_MANAGER_ENUMERATE_SERVICE, SERVICE_STATE_ALL, SERVICE_WIN32,
    };

    let mut map: HashMap<u32, Vec<String>> = HashMap::new();

    unsafe {
        // Open SCM with enumerate permission
        let scm: SC_HANDLE = OpenSCManagerW(ptr::null(), ptr::null(), SC_MANAGER_ENUMERATE_SERVICE);
        if scm.is_null() {
            log::warn!("[build_service_pid_map] OpenSCManagerW failed");
            return map;
        }

        // First call to get required buffer size
        let mut bytes_needed: u32 = 0;
        let mut services_returned: u32 = 0;
        let mut resume_handle: u32 = 0;

        let _ = EnumServicesStatusExW(
            scm,
            0, // SC_ENUM_PROCESS_INFO
            SERVICE_WIN32,
            SERVICE_STATE_ALL,
            ptr::null_mut(),
            0,
            &mut bytes_needed,
            &mut services_returned,
            &mut resume_handle,
            ptr::null(),
        );

        if bytes_needed == 0 {
            CloseServiceHandle(scm);
            return map;
        }

        // Allocate buffer and enumerate
        let buf_size = bytes_needed as usize + std::mem::size_of::<ENUM_SERVICE_STATUS_PROCESSW>();
        let mut buffer: Vec<u8> = vec![0u8; buf_size];
        let services_ptr = buffer.as_mut_ptr() as *mut ENUM_SERVICE_STATUS_PROCESSW;

        let ok = EnumServicesStatusExW(
            scm,
            0,
            SERVICE_WIN32,
            SERVICE_STATE_ALL,
            services_ptr as *mut u8,
            buf_size as u32,
            &mut bytes_needed,
            &mut services_returned,
            &mut resume_handle,
            ptr::null(),
        );

        if ok != 0 {
            let services = std::slice::from_raw_parts(services_ptr, services_returned as usize);
            for svc in services {
                let pid = svc.ServiceStatusProcess.dwProcessId;
                if pid == 0 {
                    continue;
                }
                // Read the service name (e.g. "osprivacy") rather than display name
                let svc_name = read_wide_string(svc.lpServiceName);
                if !svc_name.is_empty() {
                    map.entry(pid).or_default().push(svc_name);
                }
            }
        }

        CloseServiceHandle(scm);
    }

    log::info!(
        "[build_service_pid_map] Mapped {} PIDs to service names",
        map.len()
    );
    for (pid, names) in &map {
        log::info!("[build_service_pid_map] PID {} -> {:?}", pid, names);
    }
    map
}

/// No-op fallback for non-Windows platforms.
#[cfg(not(target_os = "windows"))]
pub fn build_service_pid_map() -> HashMap<u32, Vec<String>> {
    HashMap::new()
}

/// Read a null-terminated wide string from a raw pointer.
#[cfg(target_os = "windows")]
unsafe fn read_wide_string(ptr: *const u16) -> String {
    if ptr.is_null() {
        return String::new();
    }
    let mut len = 0;
    while *ptr.add(len) != 0 {
        len += 1;
    }
    let slice = std::slice::from_raw_parts(ptr, len);
    String::from_utf16_lossy(slice)
}
