use serde::{Deserialize, Serialize};
use tauri::AppHandle;

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

    let package_info = app_handle.package_info();

    // 从配置中获取 identifier（从 tauri.conf.json 读取）
    // 在 Tauri 2.0 中，可以通过 config() 获取，但需要正确的类型
    // 这里使用默认值，实际值应该从配置文件中读取
    let identifier = "com.gtamodx.manager".to_string();

    // description 可能不存在或类型不匹配，暂时设为 None
    let description = None;

    let app_info = AppInfo {
        name: package_info.name.clone(),
        version: package_info.version.to_string(),
        identifier,
        description,
    };

    ApiResponse::success(app_info)
}
