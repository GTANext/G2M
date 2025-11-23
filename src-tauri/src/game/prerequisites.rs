use crate::game::{
    ApiResponse, CustomPrerequisiteFile, CustomPrerequisiteInfo,
    CustomPrerequisiteInstallRequest, ManualLoaderBinding, ModLoaderStatus,
};
use crate::game::utils::{copy_dir_all, find_file_case_insensitive};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

// 获取自定义前置列表文件路径
fn get_custom_prerequisites_path(game_dir: &str) -> PathBuf {
    Path::new(game_dir).join("g2m_custom_prerequisites.json")
}

// 获取手动绑定列表文件路径
fn get_manual_bindings_path(game_dir: &str) -> PathBuf {
    Path::new(game_dir).join("g2m_manual_bindings.json")
}

// 读取手动绑定列表
pub(crate) fn load_manual_bindings(game_dir: &str) -> Vec<ManualLoaderBinding> {
    let bindings_path = get_manual_bindings_path(game_dir);
    if !bindings_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&bindings_path) {
        Ok(content) => match serde_json::from_str::<Vec<ManualLoaderBinding>>(&content) {
            Ok(bindings) => bindings,
            Err(e) => {
                eprintln!("解析手动绑定列表失败: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            eprintln!("读取手动绑定列表失败: {}", e);
            Vec::new()
        }
    }
}

// 保存手动绑定列表
fn save_manual_bindings(game_dir: &str, bindings: &[ManualLoaderBinding]) -> Result<(), String> {
    let bindings_path = get_manual_bindings_path(game_dir);
    match serde_json::to_string_pretty(bindings) {
        Ok(json_content) => fs::write(&bindings_path, json_content)
            .map_err(|e| format!("保存手动绑定列表失败: {}", e)),
        Err(e) => Err(format!("序列化手动绑定列表失败: {}", e)),
    }
}

// 读取自定义前置列表
pub(crate) fn load_custom_prerequisites(game_dir: &str) -> Vec<CustomPrerequisiteInfo> {
    let prereq_path = get_custom_prerequisites_path(game_dir);
    if !prereq_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&prereq_path) {
        Ok(content) => match serde_json::from_str::<Vec<CustomPrerequisiteInfo>>(&content) {
            Ok(prereqs) => prereqs,
            Err(e) => {
                eprintln!("解析自定义前置列表失败: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            eprintln!("读取自定义前置列表失败: {}", e);
            Vec::new()
        }
    }
}

// 保存自定义前置列表
fn save_custom_prerequisites(
    game_dir: &str,
    prereqs: &[CustomPrerequisiteInfo],
) -> Result<(), String> {
    let prereq_path = get_custom_prerequisites_path(game_dir);
    match serde_json::to_string_pretty(prereqs) {
        Ok(json_content) => fs::write(&prereq_path, json_content)
            .map_err(|e| format!("保存自定义前置列表失败: {}", e)),
        Err(e) => Err(format!("序列化自定义前置列表失败: {}", e)),
    }
}

#[tauri::command]
pub async fn check_mod_loaders(
    game_dir: String,
    _game_type: Option<String>, // 保留参数以保持API兼容性，但不再使用
) -> Result<ApiResponse<ModLoaderStatus>, String> {
    let game_path = Path::new(&game_dir);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    let mut has_dinput8 = false;
    let mut has_modloader = false;
    let mut has_cleo = false;
    let mut has_cleo_redux = false;
    let mut found_loaders = Vec::new();
    let mut missing_loaders = Vec::new();

    // 检查 dinput8.dll (在游戏根目录，不区分大小写)
    if let Some((_path, name)) = find_file_case_insensitive(game_path, "dinput8.dll") {
        has_dinput8 = true;
        found_loaders.push(format!("dinput8.dll (游戏根目录/{})", name));
    } else {
        missing_loaders.push("dinput8.dll".to_string());
    }

    // 定义要检查的目录
    let check_dirs = vec![
        ("游戏根目录", game_path.to_path_buf()),
        ("plugins目录", game_path.join("plugins")),
        ("scripts目录", game_path.join("scripts")),
    ];

    // 检查CLEO：在根目录、plugins目录、scripts目录中查找
    // 不区分大小写，查找 CLEO.asi、III.CLEO.asi、VC.CLEO.asi 等，但不包括 cleo_redux.asi
    for (dir_name, check_dir) in &check_dirs {
        if !check_dir.exists() || !check_dir.is_dir() {
            continue;
        }

        // 读取目录中的所有文件，查找 CLEO.asi 文件（不区分大小写）
        if let Ok(entries) = std::fs::read_dir(check_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        let file_name = entry.file_name();
                        let file_name_str = file_name.to_string_lossy().to_string();
                        let file_name_lower = file_name_str.to_lowercase();

                        // 检查文件名是否以 ".asi" 结尾，包含 "cleo" 但不包含 "cleo_redux" 或 "redux"
                        if file_name_lower.ends_with(".asi")
                            && file_name_lower.contains("cleo")
                            && !file_name_lower.contains("cleo_redux")
                            && !file_name_lower.contains("redux")
                        {
                            has_cleo = true;
                            found_loaders.push(format!("CLEO ({}/{})", dir_name, file_name_str));
                            break;
                        }
                    }
                }
            }
        }

        if has_cleo {
            break; // 找到CLEO后立即停止搜索
        }
    }

    if !has_cleo {
        missing_loaders.push("CLEO".to_string());
    }

    // 检查 ModLoader
    // 检查根目录是否存在 modloader 文件夹（不区分大小写）
    let modloader_folder = game_path.join("modloader");
    if modloader_folder.exists() && modloader_folder.is_dir() {
        has_modloader = true;
        found_loaders.push("ModLoader (游戏根目录/modloader文件夹)".to_string());
    } else {
        // 尝试不区分大小写查找 modloader 文件夹
        if let Ok(entries) = std::fs::read_dir(game_path) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let dir_name = entry.file_name();
                        let dir_name_str = dir_name.to_string_lossy().to_string();
                        if dir_name_str.to_lowercase() == "modloader" {
                            has_modloader = true;
                            found_loaders
                                .push(format!("ModLoader (游戏根目录/{}文件夹)", dir_name_str));
                            break;
                        }
                    }
                }
            }
        }
    }

    // 检查所有可能目录中的 modloader.asi（根目录、plugins目录、scripts目录）
    // 不区分大小写查找 modloader.asi，无论是否已找到文件夹，都继续检测 .asi 文件
    for (dir_name, check_dir) in &check_dirs {
        if let Some((_path, found_name)) = find_file_case_insensitive(check_dir, "modloader.asi") {
            has_modloader = true; // 只要找到 modloader.asi 就认为已安装
            found_loaders.push(format!("ModLoader ({}/{})", dir_name, found_name));
            // 不break，继续检查其他目录，记录所有找到的modloader.asi
        }
    }

    if !has_modloader {
        missing_loaders.push("ModLoader".to_string());
    }

    // 检查 CLEO Redux：在根目录、plugins目录、scripts目录中查找 cleo_redux.asi（不区分大小写）
    for (dir_name, check_dir) in &check_dirs {
        if let Some((_path, found_name)) = find_file_case_insensitive(check_dir, "cleo_redux.asi") {
            has_cleo_redux = true;
            found_loaders.push(format!("CLEO Redux ({}/{})", dir_name, found_name));
            break; // 找到 CLEO Redux 后立即停止搜索
        }
    }

    if !has_cleo_redux {
        missing_loaders.push("CLEO Redux".to_string());
    }

    // 检查手动绑定的标准前置插件（在所有标准检测之后）
    // 如果存在手动绑定，应该用手动绑定的信息替换标准检测到的信息
    let manual_bindings = load_manual_bindings(&game_dir);
    for binding in &manual_bindings {
        let binding_path = game_path.join(&binding.file_path);
        if binding_path.exists() && binding_path.is_file() {
            // 确定目录名称
            let dir_name = if binding.file_path.starts_with("plugins/") {
                "plugins目录"
            } else if binding.file_path.starts_with("scripts/") {
                "scripts目录"
            } else {
                "游戏根目录"
            };

            match binding.loader_type.as_str() {
                "cleo" => {
                    // 移除标准检测到的 CLEO 信息
                    found_loaders.retain(|x| !x.starts_with("CLEO (") || x.contains("CLEO Redux"));
                    has_cleo = true;
                    found_loaders.push(format!("CLEO ({}/{})", dir_name, binding.file_name));
                    missing_loaders.retain(|x| x != "CLEO");
                }
                "cleo_redux" => {
                    // 移除标准检测到的 CLEO Redux 信息
                    found_loaders.retain(|x| !x.starts_with("CLEO Redux ("));
                    has_cleo_redux = true;
                    found_loaders
                        .push(format!("CLEO Redux ({}/{})", dir_name, binding.file_name));
                    missing_loaders.retain(|x| x != "CLEO Redux");
                }
                "modloader" => {
                    // 移除标准检测到的 ModLoader 信息（包括文件夹和 .asi 文件）
                    found_loaders.retain(|x| {
                        !x.starts_with("ModLoader (") && !x.contains("ModLoader (游戏根目录/modloader")
                    });
                    has_modloader = true;
                    found_loaders
                        .push(format!("ModLoader ({}/{})", dir_name, binding.file_name));
                    missing_loaders.retain(|x| x != "ModLoader");
                }
                "dinput8" => {
                    // 移除标准检测到的 dinput8.dll 信息
                    found_loaders.retain(|x| !x.starts_with("dinput8.dll ("));
                    has_dinput8 = true;
                    found_loaders
                        .push(format!("dinput8.dll ({}/{})", dir_name, binding.file_name));
                    missing_loaders.retain(|x| x != "dinput8.dll");
                }
                _ => {}
            }
        }
    }

    // 检查自定义前置
    let custom_prereqs = load_custom_prerequisites(&game_dir);
    for custom_prereq in &custom_prereqs {
        let mut all_found = true;
        let mut found_files = Vec::new();

        for file in &custom_prereq.files {
            let file_path = game_path.join(&file.target_path);
            let exists = if file.is_directory {
                file_path.exists() && file_path.is_dir()
            } else {
                file_path.exists() && file_path.is_file()
            };

            if exists {
                found_files.push(file.file_name.clone());
            } else {
                all_found = false;
            }
        }

        if all_found && !found_files.is_empty() {
            let dir_name = match custom_prereq.target_dir.as_str() {
                "plugins" => "plugins目录",
                "scripts" => "scripts目录",
                _ => "游戏根目录",
            };
            let files_str = found_files.join(", ");
            found_loaders.push(format!(
                "{} ({}/{})",
                custom_prereq.name, dir_name, files_str
            ));
        } else {
            missing_loaders.push(custom_prereq.name.clone());
        }
    }

    // 收集手动绑定的加载器类型
    let manual_bindings: Vec<String> = load_manual_bindings(&game_dir)
        .iter()
        .map(|b| b.loader_type.clone())
        .collect();

    let status = ModLoaderStatus {
        has_dinput8,
        has_modloader,
        has_cleo,
        has_cleo_redux,
        missing_loaders,
        found_loaders,
        manual_bindings,
    };

    Ok(ApiResponse::success(status))
}

// 选择 MOD 加载器文件（用于手动指定）
#[tauri::command]
pub async fn select_mod_loader_file(
    app_handle: AppHandle,
    default_dir: Option<String>,
) -> Result<ApiResponse<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    let mut file_dialog = app_handle
        .dialog()
        .file()
        .set_title("选择 MOD 加载器文件")
        .add_filter("加载器文件", &["asi", "dll"]);

    // 如果提供了默认目录，设置为起始目录
    if let Some(dir) = default_dir {
        if let Ok(path) = PathBuf::from(&dir).canonicalize() {
            file_dialog = file_dialog.set_directory(path);
        }
    }

    file_dialog.pick_file(move |path| {
        let _ = tx.send(path);
    });

    match rx.recv() {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            Ok(ApiResponse::success(path_str))
        }
        Ok(None) => Ok(ApiResponse::error(String::new())), // 用户取消，不返回错误信息
        Err(_) => Ok(ApiResponse::error("文件选择失败".to_string())),
    }
}

// 手动标记 MOD 加载器为已安装
#[tauri::command]
pub async fn mark_mod_loader_manual(
    game_dir: String,
    loader_type: String, // "cleo", "cleo_redux", "modloader", "dinput8"
    file_path: String,
) -> Result<ApiResponse<ModLoaderStatus>, String> {
    let game_path = Path::new(&game_dir);
    let loader_file_path = Path::new(&file_path);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    if !loader_file_path.exists() || !loader_file_path.is_file() {
        return Ok(ApiResponse::error("指定的文件不存在".to_string()));
    }

    // 验证文件是否在游戏目录或其子目录中
    let file_path_abs = loader_file_path
        .canonicalize()
        .map_err(|e| format!("无法获取文件绝对路径: {}", e))?;
    let game_path_abs = game_path
        .canonicalize()
        .map_err(|e| format!("无法获取游戏目录绝对路径: {}", e))?;

    if !file_path_abs.starts_with(&game_path_abs) {
        return Ok(ApiResponse::error(
            "文件必须在游戏目录或其子目录中".to_string(),
        ));
    }

    // 计算相对路径
    let relative_path = file_path_abs
        .strip_prefix(&game_path_abs)
        .map_err(|_| "无法计算相对路径".to_string())?;

    let relative_path_str = relative_path.to_string_lossy().to_string();
    let file_name = relative_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未知文件")
        .to_string();

    // 保存手动绑定到配置文件
    let mut bindings = load_manual_bindings(&game_dir);

    // 移除该类型的旧绑定（如果存在）
    bindings.retain(|b| b.loader_type != loader_type);

    // 添加新绑定
    bindings.push(ManualLoaderBinding {
        loader_type: loader_type.clone(),
        file_path: relative_path_str.clone(),
        file_name: file_name.clone(),
    });

    // 保存绑定列表
    save_manual_bindings(&game_dir, &bindings).map_err(|e| format!("保存手动绑定失败: {}", e))?;

    // 重新检查 MOD 加载器状态（会自动识别手动绑定的文件）
    let status_result = check_mod_loaders(game_dir.clone(), None).await?;

    Ok(status_result)
}

// 取消手动标记 MOD 加载器
#[tauri::command]
pub async fn unmark_mod_loader_manual(
    game_dir: String,
    loader_type: String, // "cleo", "cleo_redux", "modloader", "dinput8"
) -> Result<ApiResponse<ModLoaderStatus>, String> {
    let game_path = Path::new(&game_dir);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    // 加载手动绑定列表
    let mut bindings = load_manual_bindings(&game_dir);

    // 移除指定类型的绑定
    let initial_len = bindings.len();
    bindings.retain(|b| b.loader_type != loader_type);

    if bindings.len() == initial_len {
        // 没有找到要移除的绑定
        return Ok(ApiResponse::error("未找到该类型的手动绑定".to_string()));
    }

    // 保存更新后的绑定列表
    save_manual_bindings(&game_dir, &bindings).map_err(|e| format!("保存手动绑定失败: {}", e))?;

    // 重新检查 MOD 加载器状态
    let status_result = check_mod_loaders(game_dir.clone(), None).await?;

    Ok(status_result)
}

// 选择多个文件或文件夹（用于自定义前置）
#[tauri::command]
pub async fn select_custom_prerequisite_files(
    app_handle: AppHandle,
) -> Result<ApiResponse<Vec<String>>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app_handle
        .dialog()
        .file()
        .set_title("选择自定义前置文件或文件夹")
        .add_filter("所有文件", &["*"])
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });

    match rx.recv() {
        Ok(Some(paths)) => {
            let path_strs: Vec<String> = paths.iter().map(|p| p.to_string()).collect();
            Ok(ApiResponse::success(path_strs))
        }
        Ok(None) => Ok(ApiResponse::error(String::new())), // 用户取消，不返回错误信息
        Err(_) => Ok(ApiResponse::error("文件选择失败".to_string())),
    }
}

// 安装自定义前置
#[tauri::command]
pub async fn install_custom_prerequisite(
    request: CustomPrerequisiteInstallRequest,
) -> Result<ApiResponse<CustomPrerequisiteInfo>, String> {
    let game_path = Path::new(&request.game_dir);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    if request.source_paths.is_empty() {
        return Ok(ApiResponse::error("请至少选择一个文件或文件夹".to_string()));
    }

    // 确定目标目录
    let target_dir_path = match request.target_dir.as_str() {
        "plugins" => {
            let plugins_dir = game_path.join("plugins");
            if !plugins_dir.exists() {
                fs::create_dir_all(&plugins_dir)
                    .map_err(|e| format!("创建 plugins 目录失败: {}", e))?;
            }
            plugins_dir
        }
        "scripts" => {
            let scripts_dir = game_path.join("scripts");
            if !scripts_dir.exists() {
                fs::create_dir_all(&scripts_dir)
                    .map_err(|e| format!("创建 scripts 目录失败: {}", e))?;
            }
            scripts_dir
        }
        "root" | _ => game_path.to_path_buf(),
    };

    let mut files = Vec::new();

    // 处理每个源路径
    for source_path_str in &request.source_paths {
        let source_path = Path::new(source_path_str);

        if !source_path.exists() {
            return Ok(ApiResponse::error(format!(
                "源路径不存在: {}",
                source_path_str
            )));
        }

        let is_directory = source_path.is_dir();
        let file_name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or(format!("无法获取文件名: {}", source_path_str))?
            .to_string();

        let target_path = target_dir_path.join(&file_name);

        // 复制文件或文件夹
        if is_directory {
            copy_dir_all(source_path, &target_path)
                .map_err(|e| format!("复制文件夹失败 {}: {}", source_path_str, e))?;
        } else {
            fs::copy(source_path, &target_path)
                .map_err(|e| format!("复制文件失败 {}: {}", source_path_str, e))?;
        }

        // 计算相对路径
        let target_relative = target_path
            .strip_prefix(game_path)
            .map_err(|_| "无法计算相对路径")?
            .to_string_lossy()
            .to_string();

        files.push(CustomPrerequisiteFile {
            file_name: file_name.clone(),
            source_path: source_path_str.clone(),
            target_path: target_relative,
            is_directory,
        });
    }

    // 创建自定义前置信息
    let custom_prereq = CustomPrerequisiteInfo {
        name: request.name,
        files: files.clone(),
        target_dir: request.target_dir,
    };

    // 加载现有自定义前置列表
    let mut custom_prereqs = load_custom_prerequisites(&request.game_dir);

    // 检查是否已存在同名前置
    if let Some(existing) = custom_prereqs
        .iter_mut()
        .find(|p| p.name == custom_prereq.name)
    {
        // 删除旧文件
        let game_path = Path::new(&request.game_dir);
        for file in &existing.files {
            let file_path = game_path.join(&file.target_path);
            if file_path.exists() {
                if file.is_directory {
                    let _ = fs::remove_dir_all(&file_path);
                } else {
                    let _ = fs::remove_file(&file_path);
                }
            }
        }
        // 更新现有前置
        *existing = custom_prereq.clone();
    } else {
        // 添加新前置
        custom_prereqs.push(custom_prereq.clone());
    }

    // 保存自定义前置列表
    save_custom_prerequisites(&request.game_dir, &custom_prereqs)
        .map_err(|e| format!("保存自定义前置列表失败: {}", e))?;

    Ok(ApiResponse::success(custom_prereq))
}

// 获取自定义前置列表
#[tauri::command]
pub async fn get_custom_prerequisites(
    game_dir: String,
) -> Result<ApiResponse<Vec<CustomPrerequisiteInfo>>, String> {
    let prereqs = load_custom_prerequisites(&game_dir);
    Ok(ApiResponse::success(prereqs))
}

// 删除自定义前置
#[tauri::command]
pub async fn delete_custom_prerequisite(
    game_dir: String,
    name: String,
) -> Result<ApiResponse<()>, String> {
    let mut custom_prereqs = load_custom_prerequisites(&game_dir);

    // 查找要删除的前置
    if let Some(prereq_info) = custom_prereqs.iter().find(|p| p.name == name) {
        // 删除文件
        let game_path = Path::new(&game_dir);
        for file in &prereq_info.files {
            let file_path = game_path.join(&file.target_path);
            if file_path.exists() {
                if file.is_directory {
                    let _ = fs::remove_dir_all(&file_path);
                } else {
                    let _ = fs::remove_file(&file_path);
                }
            }
        }
    }

    // 从列表中移除
    custom_prereqs.retain(|p| p.name != name);

    // 保存更新后的列表
    save_custom_prerequisites(&game_dir, &custom_prereqs)
        .map_err(|e| format!("保存自定义前置列表失败: {}", e))?;

    Ok(ApiResponse::success(()))
}

// 检查游戏目录中是否存在 plugins 或 scripts 目录
#[tauri::command]
pub async fn check_game_directories(
    game_dir: String,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let game_path = Path::new(&game_dir);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    let has_plugins = game_path.join("plugins").exists() && game_path.join("plugins").is_dir();
    let has_scripts = game_path.join("scripts").exists() && game_path.join("scripts").is_dir();

    // 确定默认安装位置
    let default_dir = if has_plugins {
        "plugins"
    } else if has_scripts {
        "scripts"
    } else {
        "root"
    };

    let result = serde_json::json!({
        "has_plugins": has_plugins,
        "has_scripts": has_scripts,
        "default_dir": default_dir,
        "available_dirs": {
            "root": true,
            "plugins": has_plugins,
            "scripts": has_scripts
        }
    });

    Ok(ApiResponse::success(result))
}
