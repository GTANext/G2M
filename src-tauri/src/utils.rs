use std::{
    io,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(target_family = "windows")]
use windows_sys::Win32::{
    Foundation::CloseHandle,
    Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY},
    System::Threading::{GetCurrentProcess, OpenProcessToken},
};

pub(crate) const GAME_DIR_PATH_VARIABLE: &str = "${GAME_DIR}";
pub(crate) const GAME_WORKSPACE_PACKAGE_FILE_NAME: &str = "package.json";
pub(crate) const GAME_WORKSPACE_PACKAGE_VERSION: u32 = 1;

pub(crate) fn system_time_to_timestamp(value: SystemTime) -> Option<i64> {
    value
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs() as i64)
}

pub(crate) fn build_game_scoped_storage_path(game_path: &Path, path: &Path) -> String {
    if let Ok(relative_path) = path.strip_prefix(game_path) {
        let normalized_relative = normalize_import_target_path(&relative_path.to_string_lossy());
        if normalized_relative.is_empty() {
            return GAME_DIR_PATH_VARIABLE.to_string();
        }

        return format!("{GAME_DIR_PATH_VARIABLE}/{normalized_relative}");
    }

    normalize_path_string(path)
}

pub(crate) fn resolve_game_scoped_path(game_path: &Path, stored_path: &str) -> PathBuf {
    let normalized = stored_path.trim().replace('\\', "/");
    if normalized == GAME_DIR_PATH_VARIABLE {
        return game_path.to_path_buf();
    }

    if let Some(relative_path) = normalized
        .strip_prefix(GAME_DIR_PATH_VARIABLE)
        .and_then(|value| value.strip_prefix('/'))
    {
        return resolve_game_target_path(game_path, relative_path);
    }

    PathBuf::from(stored_path)
}

pub(crate) fn normalize_path_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub(crate) fn infer_target_folder_from_target_path(target_path: &str) -> String {
    normalize_import_target_path(target_path)
        .split('/')
        .find(|segment| !segment.is_empty())
        .unwrap_or_default()
        .to_string()
}

pub(crate) fn normalize_import_target_path(target_path: &str) -> String {
    target_path
        .trim()
        .replace('\\', "/")
        .trim_matches('/')
        .to_string()
}

pub(crate) fn resolve_game_target_path(game_path: &Path, target_path: &str) -> PathBuf {
    let mut resolved = game_path.to_path_buf();
    for segment in target_path.split('/').filter(|segment| !segment.is_empty()) {
        resolved.push(segment);
    }
    resolved
}

pub(crate) fn format_symlink_creation_error(error: io::Error) -> String {
    #[cfg(target_family = "windows")]
    if error.raw_os_error() == Some(1314) {
        return "创建 Symbolic Link 失败：当前没有所需权限，请以管理员身份启动 G2M 后重试。".to_string();
    }

    format!("failed to create mod symlink: {error}")
}

#[cfg(target_family = "windows")]
pub(crate) fn is_process_elevated() -> bool {
    unsafe {
        let mut token_handle = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut return_length = 0u32;
        let result = GetTokenInformation(
            token_handle,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut return_length,
        );
        CloseHandle(token_handle);

        result != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(not(target_family = "windows"))]
pub(crate) fn is_process_elevated() -> bool {
    true
}

pub(crate) fn build_mod_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    format!("mod-{timestamp}-{}", random_suffix())
}

pub(crate) fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

pub(crate) fn random_suffix() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| format!("{:x}", duration.as_nanos()))
        .unwrap_or_else(|_| "0".to_string())
}

pub(crate) fn paths_equal(left: &Path, right: &Path) -> bool {
    let normalize = |path: &Path| path.to_string_lossy().replace('\\', "/").to_lowercase();
    normalize(left) == normalize(right)
}
