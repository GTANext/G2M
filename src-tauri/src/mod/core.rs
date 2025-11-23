use crate::game::types::{ApiResponse, G2MModConfig, UserModInstallRequest, UserModInstallResult};
use crate::mod_core::config::load_g2m_mod_config;
use crate::mod_core::utils::{
    copy_dir_all, is_texture_or_model_directory, is_texture_or_model_file,
};
use std::fs;
use std::path::Path;

/// 自动识别并安装 MOD 文件
fn auto_install_mod(
    mod_source_path: &Path,
    game_dir: &Path,
    mod_name: &str,
) -> Result<UserModInstallResult, String> {
    let mut installed_files = Vec::new();
    let mut created_directories = Vec::new();

    // 确保 CLEO 和 modloader 目录存在
    let cleo_dir = game_dir.join("CLEO");
    let modloader_dir = game_dir.join("modloader");

    if !cleo_dir.exists() {
        fs::create_dir_all(&cleo_dir).map_err(|e| format!("创建 CLEO 目录失败: {}", e))?;
        created_directories.push("CLEO".to_string());
    }

    if !modloader_dir.exists() {
        fs::create_dir_all(&modloader_dir)
            .map_err(|e| format!("创建 modloader 目录失败: {}", e))?;
        created_directories.push("modloader".to_string());
    }

    // 在 modloader 下创建以 MOD 名称命名的目录
    let mod_modloader_dir = modloader_dir.join(format!("[{}]", mod_name));
    if !mod_modloader_dir.exists() {
        fs::create_dir_all(&mod_modloader_dir)
            .map_err(|e| format!("创建 MOD modloader 目录失败: {}", e))?;
        created_directories.push(format!("modloader/[{}]", mod_name));
    }

    // 处理源路径
    if mod_source_path.is_file() {
        // 处理单个文件
        let file_name = mod_source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无法获取文件名")?;

        let new_file_name = format!("[{}]{}", mod_name, file_name);

        if let Some(ext) = mod_source_path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();

            if ext_lower == "cs" {
                // .cs 文件复制到 CLEO 目录
                let dest = cleo_dir.join(&new_file_name);
                fs::copy(mod_source_path, &dest)
                    .map_err(|e| format!("复制 .cs 文件失败: {}", e))?;
                installed_files.push(format!("CLEO/{}", new_file_name));
            } else if is_texture_or_model_file(mod_source_path) {
                // 贴图/模型文件复制到 modloader 目录
                let dest = mod_modloader_dir.join(&new_file_name);
                fs::copy(mod_source_path, &dest)
                    .map_err(|e| format!("复制贴图/模型文件失败: {}", e))?;
                installed_files.push(format!("modloader/[{}]/{}", mod_name, new_file_name));
            } else {
                // 其他文件也复制到 modloader 目录
                let dest = mod_modloader_dir.join(&new_file_name);
                fs::copy(mod_source_path, &dest).map_err(|e| format!("复制文件失败: {}", e))?;
                installed_files.push(format!("modloader/[{}]/{}", mod_name, new_file_name));
            }
        } else {
            // 没有扩展名的文件，复制到 modloader 目录
            let dest = mod_modloader_dir.join(&new_file_name);
            fs::copy(mod_source_path, &dest).map_err(|e| format!("复制文件失败: {}", e))?;
            installed_files.push(format!("modloader/[{}]/{}", mod_name, new_file_name));
        }
    } else if mod_source_path.is_dir() {
        // 处理目录
        let dir_name = mod_source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无法获取目录名")?;

        let new_dir_name = format!("[{}]{}", mod_name, dir_name);

        // 检查目录是否包含贴图/模型文件
        if is_texture_or_model_directory(mod_source_path) {
            // 复制到 modloader 目录
            let dest = mod_modloader_dir.join(&new_dir_name);
            copy_dir_all(mod_source_path, &dest)
                .map_err(|e| format!("复制贴图/模型目录失败: {}", e))?;
            installed_files.push(format!("modloader/[{}]/{}", mod_name, new_dir_name));
        } else {
            // 检查目录中是否有 .cs 文件
            let mut has_cs_files = false;
            if let Ok(entries) = fs::read_dir(mod_source_path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(ext) = path.extension() {
                            if ext.to_string_lossy().to_lowercase() == "cs" {
                                has_cs_files = true;
                                break;
                            }
                        }
                    }
                }
            }

            if has_cs_files {
                // 包含 .cs 文件，复制到 CLEO 目录
                let dest = cleo_dir.join(&new_dir_name);
                copy_dir_all(mod_source_path, &dest)
                    .map_err(|e| format!("复制 CLEO 目录失败: {}", e))?;
                installed_files.push(format!("CLEO/{}", new_dir_name));
            } else {
                // 其他情况，复制到 modloader 目录
                let dest = mod_modloader_dir.join(&new_dir_name);
                copy_dir_all(mod_source_path, &dest).map_err(|e| format!("复制目录失败: {}", e))?;
                installed_files.push(format!("modloader/[{}]/{}", mod_name, new_dir_name));
            }
        }
    } else {
        return Err("源路径既不是文件也不是目录".to_string());
    }

    Ok(UserModInstallResult {
        installed_files,
        created_directories,
    })
}

/// 根据 g2m_mod.json 配置安装 MOD
fn install_mod_with_config(
    mod_source_path: &Path,
    game_dir: &Path,
    config: &G2MModConfig,
) -> Result<UserModInstallResult, String> {
    let mut installed_files = Vec::new();
    let mut created_directories = Vec::new();

    // 确定 MOD 根目录
    let mod_root = if mod_source_path.is_file() {
        mod_source_path.parent().ok_or("无法获取文件所在目录")?
    } else {
        mod_source_path
    };

    for file_entry in &config.files {
        let source_path = mod_root.join(&file_entry.source);

        if !source_path.exists() {
            eprintln!("警告: 源文件不存在: {}", source_path.display());
            continue;
        }

        let target_path = game_dir.join(&file_entry.target);

        // 确保目标目录存在
        if let Some(parent) = target_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
                if let Ok(parent_str) = parent.strip_prefix(game_dir) {
                    created_directories.push(parent_str.to_string_lossy().replace('\\', "/"));
                }
            }
        }

        if file_entry.is_directory {
            // 复制目录
            copy_dir_all(&source_path, &target_path).map_err(|e| format!("复制目录失败: {}", e))?;
        } else {
            // 复制文件
            fs::copy(&source_path, &target_path).map_err(|e| format!("复制文件失败: {}", e))?;
        }

        installed_files.push(file_entry.target.clone());
    }

    Ok(UserModInstallResult {
        installed_files,
        created_directories,
    })
}

/// 安装用户 MOD
#[tauri::command]
pub async fn install_user_mod(
    request: UserModInstallRequest,
) -> Result<ApiResponse<UserModInstallResult>, String> {
    let mod_source_path = Path::new(&request.mod_source_path);
    let game_dir = Path::new(&request.game_dir);

    // 验证路径
    if !mod_source_path.exists() {
        return Ok(ApiResponse::error("MOD 源路径不存在".to_string()));
    }

    if !game_dir.exists() || !game_dir.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    // 检查是否有 g2m_mod.json 配置文件
    let config = load_g2m_mod_config(mod_source_path);

    let result = if let Some(config) = config {
        // 使用配置文件安装
        install_mod_with_config(mod_source_path, game_dir, &config)
            .map_err(|e| format!("使用配置安装 MOD 失败: {}", e))?
    } else {
        // 自动识别安装
        auto_install_mod(mod_source_path, game_dir, &request.mod_name)
            .map_err(|e| format!("自动安装 MOD 失败: {}", e))?
    };

    Ok(ApiResponse::success(result))
}
