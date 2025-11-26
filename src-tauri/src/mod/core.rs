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

/// 安装 MOD 到指定目录
/// 将 MOD 文件/目录复制到用户指定的游戏目录子目录
fn install_mod_to_directory(
    mod_source_path: &Path,
    game_dir: &Path,
    target_directory: &str,
    _mod_name: &str,
    overwrite: bool,
) -> Result<UserModInstallResult, String> {
    let mut installed_files = Vec::new();
    let mut created_directories = Vec::new();

    // 构建目标目录路径（相对于游戏目录）
    let target_dir = game_dir.join(target_directory);

    // 确保目标目录存在
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("创建目标目录失败: {}\n目标路径: {}", e, target_dir.display()))?;
        created_directories.push(target_directory.to_string());
    }

    // 处理源路径
    if mod_source_path.is_file() {
        // 处理单个文件
        let file_name = mod_source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无法获取文件名")?;

        let dest = target_dir.join(file_name);

        // 检查冲突
        if dest.exists() && !overwrite {
            return Err(format!(
                "文件冲突: {}/{} 已存在，请选择是否覆盖",
                target_directory, file_name
            ));
        }

        fs::copy(mod_source_path, &dest)
            .map_err(|e| format!("复制文件失败: {}\n目标路径: {}", e, dest.display()))?;

        installed_files.push(format!("{}/{}", target_directory, file_name));
    } else if mod_source_path.is_dir() {
        // 处理目录
        let dir_name = mod_source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("无法获取目录名")?;

        let dest = target_dir.join(dir_name);

        // 检查冲突（对于目录，检查是否存在且非空）
        if check_dir_conflict(&dest) && !overwrite {
            return Err(format!(
                "目录冲突: {}/{} 已存在且非空，请选择是否覆盖",
                target_directory, dir_name
            ));
        }

        copy_dir_all(mod_source_path, &dest)
            .map_err(|e| format!("复制目录失败: {}\n目标路径: {}", e, dest.display()))?;

        installed_files.push(format!("{}/{}", target_directory, dir_name));
    } else {
        return Err("源路径既不是文件也不是目录".to_string());
    }

    Ok(UserModInstallResult {
        installed_files,
        created_directories,
    })
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

/// 根据 g2m.json 配置安装 MOD
/// 严格按照配置文件中的 modfile 列表，将指定文件复制到指定目录
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

    println!("开始安装 MOD: {}", config.name);
    println!("MOD 根目录: {}", mod_root.display());
    println!("游戏目录: {}", game_dir.display());
    println!("配置文件中的文件数量: {}", config.modfile.len());

    // 遍历配置文件中的每个文件条目
    for (index, file_entry) in config.modfile.iter().enumerate() {
        // 构建源路径（相对于 MOD 根目录）
        let source_path = mod_root.join(&file_entry.source);

        // 检查源文件是否存在
        if !source_path.exists() {
            let error_msg = format!(
                "源文件不存在: {}\n源路径: {}\nMOD根目录: {}",
                file_entry.source,
                source_path.display(),
                mod_root.display()
            );
            eprintln!("警告: {}", error_msg);
            return Err(error_msg);
        }

        // 构建目标路径（相对于游戏目录）
        let target_path = game_dir.join(&file_entry.target);

        println!(
            "[{}/{}] 复制: {} -> {}",
            index + 1,
            config.modfile.len(),
            source_path.display(),
            target_path.display()
        );

        // 确保目标目录存在
        if let Some(parent) = target_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| {
                    format!("创建目标目录失败: {}\n目标路径: {}", e, parent.display())
                })?;
                if let Ok(parent_str) = parent.strip_prefix(game_dir) {
                    let dir_str = parent_str.to_string_lossy().replace('\\', "/");
                    if !created_directories.contains(&dir_str) {
                        created_directories.push(dir_str);
                    }
                }
            }
        }

        // 根据文件类型复制
        if file_entry.is_directory {
            // 复制目录
            copy_dir_all(&source_path, &target_path).map_err(|e| {
                format!(
                    "复制目录失败\n源路径: {}\n目标路径: {}\n错误: {}",
                    source_path.display(),
                    target_path.display(),
                    e
                )
            })?;
            println!("  ✓ 目录复制成功");
        } else {
            // 复制文件
            fs::copy(&source_path, &target_path).map_err(|e| {
                format!(
                    "复制文件失败\n源路径: {}\n目标路径: {}\n错误: {}",
                    source_path.display(),
                    target_path.display(),
                    e
                )
            })?;
            println!("  ✓ 文件复制成功");
        }

        installed_files.push(file_entry.target.clone());
    }

    println!("MOD 安装完成，共安装 {} 个文件/目录", installed_files.len());

    Ok(UserModInstallResult {
        installed_files,
        created_directories,
    })
}

fn classify_install_type(path: &str) -> Option<String> {
    let lowered = path.to_lowercase();
    if lowered.starts_with("plugins/cleo") {
        Some("cleo_redux".to_string())
    } else if lowered.starts_with("cleo/") || lowered.ends_with(".cs") {
        Some("cleo".to_string())
    } else if lowered.starts_with("modloader/") {
        Some("modloader".to_string())
    } else if lowered.ends_with(".asi") {
        Some("asi".to_string())
    } else if lowered.ends_with(".dll") {
        Some("dll".to_string())
    } else {
        None
    }
}

/// 从路径中提取原始文件名（去掉 [MOD名称] 前缀）
fn extract_original_filename(path: &str) -> String {
    let file_name = path.split('/').last().unwrap_or(path);
    
    // 如果文件名以 [ 开头，尝试提取原始文件名
    if file_name.starts_with('[') {
        // 查找第一个 ] 的位置
        if let Some(end_bracket) = file_name.find(']') {
            // 提取 ] 之后的部分作为原始文件名
            let original = &file_name[end_bracket + 1..];
            if !original.is_empty() {
                return original.to_string();
            }
        }
    }
    
    // 如果路径包含 modloader/[MOD名称]/，需要提取最后一个文件名部分
    // 例如：modloader/[MOD名称]/[MOD名称]文件名 -> 文件名
    if path.contains("modloader/") || path.contains("modloader\\") {
        // 如果文件名仍然包含 [MOD名称] 前缀，再次提取
        if file_name.starts_with('[') {
            if let Some(end_bracket) = file_name.find(']') {
                let original = &file_name[end_bracket + 1..];
                if !original.is_empty() {
                    return original.to_string();
                }
            }
        }
    }
    
    file_name.to_string()
}

/// 将实际路径转换为变量格式，如 "${cleo}/文件名.cs"
fn convert_path_to_variable_format(path: &str, r#type: Option<&String>) -> Option<String> {
    let normalized = path.replace('\\', "/");
    
    // 确定变量名
    let var_name = if let Some(typ) = r#type {
        match typ.as_str() {
            "cleo" => "cleo",
            "cleo_redux" => "cleo_redux",
            "modloader" => "modloader",
            "asi" => "asi",
            "dll" => "dll",
            _ => {
                // 根据路径特征推断
                let lower = normalized.to_lowercase();
                if lower.starts_with("plugins/cleo") {
                    "cleo_redux"
                } else if lower.starts_with("cleo/") || lower.ends_with(".cs") {
                    "cleo"
                } else if lower.starts_with("modloader/") {
                    "modloader"
                } else if lower.ends_with(".asi") {
                    "asi"
                } else if lower.ends_with(".dll") {
                    "dll"
                } else {
                    return Some(normalized); // 无法识别，返回原路径
                }
            }
        }
    } else {
        // 没有type，根据路径特征推断
        let lower = normalized.to_lowercase();
        if lower.starts_with("plugins/cleo") {
            "cleo_redux"
        } else if lower.starts_with("cleo/") || lower.ends_with(".cs") {
            "cleo"
        } else if lower.starts_with("modloader/") {
            "modloader"
        } else if lower.ends_with(".asi") {
            "asi"
        } else if lower.ends_with(".dll") {
            "dll"
        } else {
            return Some(normalized); // 无法识别，返回原路径
        }
    };
    
    // 提取原始文件名（去掉 [MOD名称] 前缀）
    let original_file_name = extract_original_filename(&normalized);
    
    // 生成变量格式路径
    Some(format!("${{{}}}/{}", var_name, original_file_name))
}

fn summarize_install_metadata(result: &UserModInstallResult) -> (Option<String>, Option<String>) {
    let primary = result
        .installed_files
        .first()
        .cloned()
        .or_else(|| result.created_directories.first().cloned());
    let normalized = primary.as_ref().map(|path| path.replace('\\', "/"));
    let r#type = normalized
        .as_ref()
        .and_then(|path| classify_install_type(path));
    
    // 将路径转换为变量格式
    let variable_path = normalized
        .as_ref()
        .and_then(|path| convert_path_to_variable_format(path, r#type.as_ref()));
    
    (r#type, variable_path)
}

/// 安装用户 MOD
#[tauri::command]
pub async fn install_user_mod(
    request: UserModInstallRequest,
) -> Result<ApiResponse<UserModInstallResult>, String> {
    let mod_source_path = Path::new(&request.mod_source_path);
    let game_dir = Path::new(&request.game_dir);
    let mod_source_path_str = mod_source_path.to_string_lossy().to_string();
    let game_dir_str = game_dir.to_string_lossy().to_string();

    // 验证路径
    if !mod_source_path.exists() {
        return Ok(ApiResponse::error(format!(
            "MOD 源路径不存在\n路径: {}\nMOD名称: {}",
            mod_source_path_str, request.mod_name
        )));
    }

    if !game_dir.exists() || !game_dir.is_dir() {
        return Ok(ApiResponse::error(format!(
            "游戏目录不存在或不是有效目录\n游戏目录: {}\nMOD名称: {}",
            game_dir_str, request.mod_name
        )));
    }

    // 检查 MOD 源路径是否在游戏目录内（会导致无限递归）
    let mod_source_canonical = mod_source_path.canonicalize().ok();
    let game_dir_canonical = game_dir.canonicalize().ok();

    let is_inside_game_dir =
        if let (Some(mod_path), Some(game_path)) = (mod_source_canonical, game_dir_canonical) {
            mod_path.starts_with(&game_path)
        } else {
            // 如果规范化失败，使用字符串比较（不区分大小写）
            let mod_path_str = mod_source_path_str.to_lowercase();
            let game_dir_str_lower = game_dir_str.to_lowercase();
            mod_path_str.starts_with(&game_dir_str_lower)
        };

    if is_inside_game_dir {
        return Ok(ApiResponse::error(format!(
            "MOD 源路径不能位于游戏目录内，这会导致无限递归\nMOD源路径: {}\n游戏目录: {}\n\n请将 MOD 文件移动到游戏目录外的位置后再安装",
            mod_source_path_str, game_dir_str
        )));
    }

    // 检查是否有 g2m.json 配置文件
    let config = load_g2m_mod_config(mod_source_path);

    let result = if let Some(config) = config {
        // 有 g2m.json：直接读取配置并执行文件复制操作
        let install_result =
            install_mod_with_config(mod_source_path, game_dir, &config).map_err(|e| {
                format!(
                    "使用配置安装 MOD 失败\nMOD名称: {}\n源路径: {}\n游戏目录: {}\n错误详情: {}",
                    config.name, mod_source_path_str, game_dir_str, e
                )
            })?;

        // 记录 MOD 到 .gtamodx/mods.json
        let (r#type, install_hint) = summarize_install_metadata(&install_result);
        if let Err(e) = add_mod_to_g2m_json(
            &request.game_dir,
            config.name.clone(),
            config.author.clone(),
            r#type,
            install_hint,
        ) {
            eprintln!("警告: 无法将 MOD 记录到 .gtamodx/mods.json: {}", e);
        }

        install_result
    } else if let Some(ref target_dir) = request.target_directory {
        // 没有 g2m.json，但用户指定了目标目录：安装到指定目录
        let install_result = install_mod_to_directory(
            mod_source_path,
            game_dir,
            target_dir,
            &request.mod_name,
            request.overwrite,
        )
        .map_err(|e| {
            format!(
                "安装 MOD 到指定目录失败\nMOD名称: {}\n源路径: {}\n游戏目录: {}\n目标目录: {}\n错误详情: {}",
                request.mod_name, mod_source_path_str, game_dir_str, target_dir, e
            )
        })?;

        // 记录 MOD 到 .gtamodx/mods.json（没有 author 信息）
        let (r#type, install_hint) = summarize_install_metadata(&install_result);
        if let Err(e) = add_mod_to_g2m_json(
            &request.game_dir,
            request.mod_name.clone(),
            None,
            r#type,
            install_hint,
        ) {
            eprintln!("警告: 无法将 MOD 记录到 .gtamodx/mods.json: {}", e);
        }

        install_result
    } else {
        // 没有 g2m.json，也没有指定目标目录：自动检测文件后缀
        let install_result = auto_install_mod(
            mod_source_path,
            game_dir,
            &request.mod_name,
            request.overwrite,
        )
        .map_err(|e| {
            format!(
                "自动安装 MOD 失败\nMOD名称: {}\n源路径: {}\n游戏目录: {}\n错误详情: {}\n\n提示: 如果自动检测失败，请手动选择安装目录",
                request.mod_name, mod_source_path_str, game_dir_str, e
            )
        })?;

        // 记录 MOD 到 .gtamodx/mods.json（没有 author 信息）
        let (r#type, install_hint) = summarize_install_metadata(&install_result);
        if let Err(e) = add_mod_to_g2m_json(
            &request.game_dir,
            request.mod_name.clone(),
            None,
            r#type,
            install_hint,
        ) {
            eprintln!("警告: 无法将 MOD 记录到 .gtamodx/mods.json: {}", e);
        }

        install_result
    };

    Ok(ApiResponse::success(result))
}
