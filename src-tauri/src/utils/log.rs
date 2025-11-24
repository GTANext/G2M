use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::panic::PanicHookInfo;
use std::sync::OnceLock;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    MessageBoxW, MB_ICONERROR, MB_OK, MB_SETFOREGROUND,
};

static LOG_FILE_PATH: OnceLock<PathBuf> = OnceLock::new();

/// 初始化日志系统，设置 panic hook
pub fn init_logger() {
    // 获取程序根目录（可执行文件所在目录）
    let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let root_dir = exe_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));
    
    let log_file = root_dir.join("error.log");
    
    // 设置全局日志文件路径
    LOG_FILE_PATH.set(log_file.clone()).ok();
    
    // 设置 panic hook
    std::panic::set_hook(Box::new(move |panic_info| {
        log_panic(panic_info, &log_file);
    }));
}

/// 记录 panic 信息到日志文件
fn log_panic(panic_info: &PanicHookInfo, log_file: &PathBuf) {
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    
    let mut log_entry = format!("\n========== PANIC ==========\n");
    log_entry.push_str(&format!("时间: {}\n", timestamp));
    
    // 获取 panic 位置
    if let Some(location) = panic_info.location() {
        log_entry.push_str(&format!(
            "位置: {}:{}:{}\n",
            location.file(),
            location.line(),
            location.column()
        ));
    }
    
    // 获取 panic 消息
    let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
        s.to_string()
    } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
        s.clone()
    } else {
        "未知错误".to_string()
    };
    
    log_entry.push_str(&format!("错误: {}\n", message));
    
    // 获取 backtrace（如果可用）
    #[cfg(debug_assertions)]
    {
        let backtrace = std::backtrace::Backtrace::capture();
        log_entry.push_str(&format!("堆栈跟踪:\n{}\n", backtrace));
    }
    
    log_entry.push_str("===========================\n");
    
    // 写入日志文件
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)
    {
        let _ = file.write_all(log_entry.as_bytes());
        let _ = file.flush();
    }
    
    // 同时输出到 stderr（控制台）
    eprintln!("{}", log_entry);
    
    // 显示系统弹窗
    show_error_dialog(&message, log_file);
}

/// 记录一般错误信息到日志文件
#[allow(dead_code)]
pub fn log_error(message: &str) {
    if let Some(log_file) = LOG_FILE_PATH.get() {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let log_entry = format!(
            "\n[{}] ERROR: {}\n",
            timestamp,
            message
        );
        
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file)
        {
            let _ = file.write_all(log_entry.as_bytes());
            let _ = file.flush();
        }
    }
}

/// 记录警告信息到日志文件
#[allow(dead_code)]
pub fn log_warning(message: &str) {
    if let Some(log_file) = LOG_FILE_PATH.get() {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let log_entry = format!(
            "\n[{}] WARNING: {}\n",
            timestamp,
            message
        );
        
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file)
        {
            let _ = file.write_all(log_entry.as_bytes());
            let _ = file.flush();
        }
    }
}

/// 显示错误对话框
fn show_error_dialog(message: &str, log_file: &PathBuf) {
    let log_file_str = log_file.to_string_lossy();
    
    // 构建对话框内容
    let dialog_content = format!(
        "程序发生严重错误并已崩溃！\n\n\
        错误信息: {}\n\n\
        错误日志已保存到:\n{}\n\n\
        请将此日志文件发送给开发者以便修复问题。",
        message,
        log_file_str
    );
    
    #[cfg(target_os = "windows")]
    {
        // Windows 系统弹窗
        let title: Vec<u16> = "程序崩溃 - GTAModxManager"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        
        let content: Vec<u16> = dialog_content
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        
        unsafe {
            MessageBoxW(
                0,
                content.as_ptr(),
                title.as_ptr(),
                MB_OK | MB_ICONERROR | MB_SETFOREGROUND,
            );
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // 非 Windows 系统，使用 stderr 输出
        eprintln!("{}", dialog_content);
    }
}

