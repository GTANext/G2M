use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,                // 应用名称
    pub version: String,             // 版本号
    pub identifier: String,          // 应用标识符
    pub description: Option<String>, // 应用描述
}

#[derive(Debug, Deserialize)]
struct AppConfig {
    #[serde(default)]
    alpha: Option<String>,
    #[serde(default)]
    release: Option<bool>,
}

/// 获取应用信息
#[tauri::command]
pub fn get_app_info(app_handle: AppHandle) -> crate::game::types::ApiResponse<AppInfo> {
    use crate::game::types::ApiResponse;

    let package_info = app_handle.package_info();
    let base_version = package_info.version.to_string();

    // 查找配置文件
    let config_path = if cfg!(debug_assertions) {
        // 开发环境从当前目录查找 src-tauri/g2m.config.json
        std::env::current_dir().ok().and_then(|dir| {
            let config_file = dir.join("src-tauri").join("g2m.config.json");
            if config_file.exists() {
                Some(config_file)
            } else {
                None
            }
        })
    } else {
        // 生产环境从可执行文件目录查找
        std::env::current_exe().ok().and_then(|exe_path| {
            exe_path
                .parent()
                .map(|parent| parent.join("g2m.config.json"))
                .filter(|p| p.exists())
        })
    };

    let mut version = base_version.clone();
    let identifier = app_handle.config().identifier.clone();

    // 如果找到配置文件，读取 alpha 和 release 字段
    if let Some(config_path) = config_path {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                // 根据 release 字段决定版本号格式
                if let Some(release) = config.release {
                    if !release {
                        // release 为 false，输出 version + alpha
                        if let Some(alpha) = config.alpha {
                            version = format!("{}-{}", base_version, alpha);
                        } else {
                            version = base_version;
                        }
                    } else {
                        // release 为 true，直接输出 version
                        version = base_version;
                    }
                } else {
                    // 如果没有 release 字段，默认使用 version + alpha（如果存在）
                    if let Some(alpha) = config.alpha {
                        version = format!("{}-{}", base_version, alpha);
                    }
                }
            }
        }
    }

    let app_info = AppInfo {
        name: package_info.name.clone(),
        version,
        identifier,
        description: None,
    };

    ApiResponse::success(app_info)
}
