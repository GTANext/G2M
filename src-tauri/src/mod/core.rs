use crate::game::types::{ApiResponse, G2MModConfig, UserModInstallRequest, UserModInstallResult};
use crate::game::utils::{add_mod_to_g2m_json, detect_game_type_from_exe, read_g2m_json};
use crate::mod_core::config::load_g2m_mod_config;
use crate::mod_core::utils::{
    copy_dir_all, is_texture_or_model_directory, is_texture_or_model_file,
};
use std::fs;
use std::path::Path;

/// 检查文件冲突
#[allow(dead_code)]
fn check_file_conflict(dest_path: &Path) -> bool {
    dest_path.exists()
}

/// 检查目录冲突（检查目录是否存在且非空）
fn check_dir_conflict(dest_path: &Path) -> bool {
    if !dest_path.exists() {
        return false;
    }
    // 检查目录是否非空
    if let Ok(entries) = fs::read_dir(dest_path) {
        entries.count() > 0
    } else {
        false
    }
}

/// 自动识别并安装 MOD 文件
/// 根据游戏目录结构和文件类型自动选择安装位置
fn auto_install_mod(
    mod_source_path: &Path,
    game_dir: &Path,
    mod_name: &str,
    overwrite: bool, // 是否覆盖冲突文件
) -> Result<UserModInstallResult, String> {
    let mut installed_files = Vec::new();
    let mut created_directories = Vec::new();

    // 检查游戏目录结构，确定安装位置
    let plugins_dir = game_dir.join("plugins");
    let cleo_dir = game_dir.join("CLEO");
    let cleo_lower_dir = game_dir.join("cleo"); // GTA SA 使用小写
    let cleo_plugins_dir = plugins_dir.join("CLEO"); // CLEO Redux 目录
    let modloader_dir = game_dir.join("modloader");

    // 确定 CLEO 目录位置（优先使用已存在的目录）
    let cleo_target_dir = if cleo_dir.exists() {
        cleo_dir.clone()
    } else if cleo_lower_dir.exists() {
        cleo_lower_dir.clone()
    } else {
        // 如果 CLEO 目录不存在，默认创建根目录下的 CLEO（GTA SA 使用小写）
        // 检查是否有 .gtamodx 配置来确定游戏类型
        let game_type = read_g2m_json(game_dir.to_str().unwrap_or(""))
            .and_then(|c| c.r#type)
            .or_else(|| {
                // 尝试从 exe 文件名识别
                if let Ok(entries) = fs::read_dir(game_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(exe_name) = path.file_name().and_then(|n| n.to_str()) {
                                if let Some(gt) = detect_game_type_from_exe(exe_name) {
                                    return Some(gt);
                                }
                            }
                        }
                    }
                }
                None
            });

        // 根据游戏类型决定 CLEO 目录名称
        match game_type.as_deref() {
            Some("gtasa") => cleo_lower_dir.clone(),
            _ => cleo_dir.clone(),
        }
    };

    // 确定 modloader 目录位置
    let modloader_target_dir = if modloader_dir.exists() {
        modloader_dir.clone()
    } else {
        modloader_dir.clone()
    };

    // 创建必要的目录
    if !cleo_target_dir.exists() {
        fs::create_dir_all(&cleo_target_dir).map_err(|e| format!("创建 CLEO 目录失败: {}", e))?;
        // 根据目录名称决定记录格式
        let cleo_dir_name = if cleo_target_dir
            .file_name()
            .and_then(|n| n.to_str())
            .map(|n| n == "cleo")
            .unwrap_or(false)
        {
            "cleo"
        } else {
            "CLEO"
        };
        created_directories.push(cleo_dir_name.to_string());
    }

    if !modloader_target_dir.exists() {
        fs::create_dir_all(&modloader_target_dir)
            .map_err(|e| format!("创建 modloader 目录失败: {}", e))?;
        created_directories.push("modloader".to_string());
    }

    // 在 modloader 下创建以 MOD 名称命名的目录
    let mod_modloader_dir = modloader_target_dir.join(format!("[{}]", mod_name));
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
                let dest = cleo_target_dir.join(&new_file_name);

                // 检查 CLEO_PLUGINS 目录中的冲突
                let cleo_plugins_file = cleo_target_dir.join("CLEO_PLUGINS").join(file_name);
                if cleo_plugins_file.exists() {
                    if !overwrite {
                        return Err(format!(
                            "文件冲突: CLEO_PLUGINS/{} 已存在，请选择是否覆盖",
                            file_name
                        ));
                    }
                }

                // 检查目标文件冲突
                if dest.exists() && !overwrite {
                    return Err(format!(
                        "文件冲突: {} 已存在，请选择是否覆盖",
                        new_file_name
                    ));
                }

                fs::copy(mod_source_path, &dest)
                    .map_err(|e| format!("复制 .cs 文件失败: {}", e))?;

                let cleo_path = if cleo_target_dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n == "cleo")
                    .unwrap_or(false)
                {
                    format!("cleo/{}", new_file_name)
                } else {
                    format!("CLEO/{}", new_file_name)
                };
                installed_files.push(cleo_path);
            } else if ext_lower == "js" || ext_lower == "ts" {
                // .js/.ts 文件（CLEO Redux）复制到 plugins/CLEO 目录
                let dest = cleo_plugins_dir.join(&new_file_name);

                // 检查冲突
                if dest.exists() && !overwrite {
                    return Err(format!(
                        "文件冲突: plugins/CLEO/{} 已存在，请选择是否覆盖",
                        new_file_name
                    ));
                }

                fs::copy(mod_source_path, &dest)
                    .map_err(|e| format!("复制 .js/.ts 文件失败: {}", e))?;
                installed_files.push(format!("plugins/CLEO/{}", new_file_name));
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
            // 检查目录中是否有 .js/.ts 文件（CLEO Redux）
            let mut has_js_ts_files = false;
            if let Ok(entries) = fs::read_dir(mod_source_path) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(ext) = path.extension() {
                            let ext_lower = ext.to_string_lossy().to_lowercase();
                            if ext_lower == "cs" {
                                has_cs_files = true;
                            } else if ext_lower == "js" || ext_lower == "ts" {
                                has_js_ts_files = true;
                            }
                            if has_cs_files && has_js_ts_files {
                                break;
                            }
                        }
                    }
                }
            }

            if has_cs_files {
                // 包含 .cs 文件，复制到 CLEO 目录
                let dest = cleo_target_dir.join(&new_dir_name);

                // 检查冲突（对于目录，检查是否存在且非空）
                if check_dir_conflict(&dest) && !overwrite {
                    return Err(format!(
                        "目录冲突: CLEO/{} 已存在且非空，请选择是否覆盖",
                        new_dir_name
                    ));
                }

                copy_dir_all(mod_source_path, &dest)
                    .map_err(|e| format!("复制 CLEO 目录失败: {}", e))?;

                let cleo_path = if cleo_target_dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n == "cleo")
                    .unwrap_or(false)
                {
                    format!("cleo/{}", new_dir_name)
                } else {
                    format!("CLEO/{}", new_dir_name)
                };
                installed_files.push(cleo_path);
            } else if has_js_ts_files {
                // 包含 .js/.ts 文件（CLEO Redux），复制到 plugins/CLEO 目录
                let dest = cleo_plugins_dir.join(&new_dir_name);

                // 检查冲突（对于目录，检查是否存在且非空）
                if check_dir_conflict(&dest) && !overwrite {
                    return Err(format!(
                        "目录冲突: plugins/CLEO/{} 已存在且非空，请选择是否覆盖或重命名",
                        new_dir_name
                    ));
                }

                copy_dir_all(mod_source_path, &dest)
                    .map_err(|e| format!("复制 CLEO Redux 目录失败: {}", e))?;
                installed_files.push(format!("plugins/CLEO/{}", new_dir_name));
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

    for file_entry in &config.modfile {
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
        let install_result = install_mod_with_config(mod_source_path, game_dir, &config)
            .map_err(|e| format!("使用配置安装 MOD 失败: {}", e))?;

        // 记录 MOD 到 g2m.json
        let mod_source_path_str = mod_source_path.to_string_lossy().to_string();
        if let Err(e) = add_mod_to_g2m_json(
            &request.game_dir,
            config.name.clone(),
            config.author.clone(),
            mod_source_path_str,
        ) {
            eprintln!("警告: 无法将 MOD 记录到 .gtamodx/mods.json: {}", e);
        }

        install_result
    } else {
        // 自动识别安装
        let install_result = auto_install_mod(
            mod_source_path,
            game_dir,
            &request.mod_name,
            request.overwrite,
        )
        .map_err(|e| format!("自动安装 MOD 失败: {}", e))?;

        // 记录 MOD 到 g2m.json（没有 author 信息）
        let mod_source_path_str = mod_source_path.to_string_lossy().to_string();
        if let Err(e) = add_mod_to_g2m_json(
            &request.game_dir,
            request.mod_name.clone(),
            None,
            mod_source_path_str,
        ) {
            eprintln!("警告: 无法将 MOD 记录到 .gtamodx/mods.json: {}", e);
        }

        install_result
    };

    Ok(ApiResponse::success(result))
}
