use std::{
    path::{Path, PathBuf},
    process::Command,
};
use winreg::enums::*;
use winreg::RegKey;

pub fn perform_startup_checks() {
    // 1. Check if the OS is at least Windows 10
    // Note: Windows 10 is 10.0, Windows 8 is 6.2, Windows 8.1 is 6.3, Windows 7 is 6.1
    // The "CurrentVersion" value in registry for Windows 10/11 is often still "6.3",
    // while "CurrentMajorVersionNumber" is introduced for actual Windows 10 detection.
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(nt_current_version) = hklm.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion") {
        let is_win10_or_above = nt_current_version.get_value::<u32, _>("CurrentMajorVersionNumber").is_ok();
        
        if !is_win10_or_above {
            // Fallback check just in case, but usually if CurrentMajorVersionNumber doesn't exist, it's < Win 10
            show_message_box(
                "不支持的操作系统",
                "G2M 仅支持 Windows 10 及以上系统。请升级您的操作系统以使用本软件。",
            );
            std::process::exit(1);
        }
    }

    // 2. Check if WebView2 is installed
    if !check_webview2_installed() {
        show_message_box(
            "缺少运行库",
            "系统未安装 WebView2 运行环境，点击确定将启动安装程序。\n安装完成后请重新运行本程序。",
        );

        if let Some(installer_path) = resolve_webview2_installer_path() {
            let _ = Command::new(installer_path).spawn();
        } else {
            show_message_box("错误", "未找到 WebView2 安装程序，请手动下载并安装。");
        }
        std::process::exit(1);
    }
}

fn resolve_webview2_installer_path() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()?
        .parent()
        .map(Path::to_path_buf)
        .map(|resource_dir| resource_dir.join("Webview2Setup.exe"))
        .filter(|path| path.is_file())
}

fn check_webview2_installed() -> bool {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let subkey_wow64 = "SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
    let subkey_cu = "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
    let subkey_local = "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";

    let check_key = |root: &RegKey, path: &str| -> bool {
        if let Ok(key) = root.open_subkey(path) {
            if let Ok(pv) = key.get_value::<String, _>("pv") {
                return !pv.is_empty() && pv != "0.0.0.0";
            }
        }
        false
    };

    check_key(&hklm, subkey_wow64) || check_key(&hkcu, subkey_cu) || check_key(&hklm, subkey_local)
}

fn show_message_box(title: &str, message: &str) {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

    let mut title_w: Vec<u16> = std::ffi::OsStr::new(title).encode_wide().collect();
    title_w.push(0);
    let mut message_w: Vec<u16> = std::ffi::OsStr::new(message).encode_wide().collect();
    message_w.push(0);

    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            message_w.as_ptr(),
            title_w.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}
