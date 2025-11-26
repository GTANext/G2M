use serde::{Deserialize, Serialize};
use tauri::AppHandle;

mod version;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,                // 应用名称
    pub version: String,             // 版本号
    pub identifier: String,          // 应用标识符
    pub description: Option<String>, // 应用描述
}

/// 获取应用信息
#[tauri::command]
pub fn get_app_info(app_handle: AppHandle) -> crate::game::types::ApiResponse<AppInfo> {
    use crate::game::types::ApiResponse;
    use version::{ALPHA, RELEASE};

    let package_info = app_handle.package_info();
    let base_version = package_info.version.to_string();
    let identifier = app_handle.config().identifier.clone();

    // 根据 RELEASE 和 ALPHA 常量决定版本号格式
    let version = if RELEASE {
        base_version
    } else {
        if let Some(alpha) = ALPHA {
            format!("{}-{}", base_version, alpha)
        } else {
            base_version
        }
    };

    let app_info = AppInfo {
        name: package_info.name.clone(),
        version,
        identifier,
        description: None,
    };

    ApiResponse::success(app_info)
}
