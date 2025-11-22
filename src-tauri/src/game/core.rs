use crate::game::{
    ApiResponse, CopyImageResponse, CustomPrerequisiteFile, CustomPrerequisiteInfo,
    CustomPrerequisiteInstallRequest, GameDetectionResult, GameInfo, GameList, ManualLoaderBinding,
    ModInstallRequest, ModInstallResult, ModLoaderStatus,
};
use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;

// 根据exe文件名识别游戏类型
fn detect_game_type_from_exe(exe_name: &str) -> Option<String> {
    match exe_name.to_lowercase().as_str() {
        "gta3.exe" => Some("gta3".to_string()),
        "gta-vc.exe" => Some("gtavc".to_string()),
        "gtasa.exe" | "gta-sa.exe" | "gta_sa.exe" => Some("gtasa".to_string()),
        _ => None,
    }
}

// 计算文件的MD5值
fn calculate_file_md5(file_path: &Path) -> Result<String, String> {
    let mut file = std::fs::File::open(file_path).map_err(|e| format!("无法打开文件: {}", e))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let digest = md5::compute(&buffer);
    Ok(format!("{:x}", digest))
}

// 游戏版本数据库：MD5到版本的映射
// TODO: 等获取到真实MD5值后再启用版本识别功能
// 当前暂时返回None，保留MD5计算功能以便后续扩展
fn get_game_version_from_md5(_game_type: &str, _md5: &str) -> Option<String> {
    // 暂时不进行版本识别，等获取到真实MD5值后再实现
    // 可以在这里添加MD5到版本的映射关系
    //
    // 示例：
    // let md5_lower = md5.to_lowercase();
    // if game_type == "gta3" {
    //     match md5_lower.as_str() {
    //         "真实的MD5值1" => Some("1.0".to_string()),
    //         "真实的MD5值2" => Some("1.1".to_string()),
    //         "真实的MD5值3" => Some("steam".to_string()),
    //         _ => Some("diy".to_string()),
    //     }
    // }

    None
}

// 工具函数
/// 写入 g2m.json 文件到游戏根目录
/// 只包含 name, exe, img, type（不包含 id, md5, version, time, deleted）
fn write_g2m_json(
    game_dir: &str,
    name: &str,
    exe: &str,
    img: &Option<String>,
    game_type: &Option<String>,
) {
    let game_path = Path::new(game_dir);
    let g2m_json_path = game_path.join("g2m.json");

    // 创建 g2m.json 内容，只包含 name, exe, img, type
    let mut g2m_data = serde_json::json!({
        "name": name,
        "exe": exe,
    });

    // 添加可选字段
    if let Some(img_value) = img {
        g2m_data["img"] = serde_json::Value::String(img_value.clone());
    }
    if let Some(type_value) = game_type {
        g2m_data["type"] = serde_json::Value::String(type_value.clone());
    }

    match serde_json::to_string_pretty(&g2m_data) {
        Ok(json_content) => {
            if let Err(e) = fs::write(&g2m_json_path, json_content) {
                // 如果写入失败，记录警告但不影响游戏保存
                eprintln!("警告: 无法在游戏目录创建 g2m.json 文件: {}", e);
            }
        }
        Err(e) => {
            eprintln!("警告: 无法序列化 g2m.json 数据: {}", e);
        }
    }
}

/// 获取配置目录路径
pub fn get_config_dir(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // 在开发环境中，使用项目根目录
    if cfg!(debug_assertions) {
        let current_dir =
            std::env::current_dir().map_err(|e| format!("无法获取当前目录: {}", e))?;
        let config_dir = current_dir.join("G2M").join("Config");
        return Ok(config_dir);
    }

    // 在生产环境中，使用exe文件所在目录
    let exe_path = std::env::current_exe().map_err(|e| format!("无法获取可执行文件路径: {}", e))?;

    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| "无法获取可执行文件所在目录".to_string())?;

    let config_dir = exe_dir.join("G2M").join("Config");
    Ok(config_dir)
}

// 游戏检测功
#[tauri::command]
pub async fn select_game_folder(
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app_handle
        .dialog()
        .file()
        .set_title("选择游戏文件夹")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });

    match rx.recv() {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            Ok(ApiResponse::success(path_str))
        }
        Ok(None) => Ok(ApiResponse::error(String::new())), // 用户取消，不返回错误信息
        Err(_) => Ok(ApiResponse::error("文件夹选择失败".to_string())),
    }
}

#[tauri::command]
pub async fn detect_game(path: String) -> Result<GameDetectionResult, String> {
    let game_dir = Path::new(&path);

    if !game_dir.exists() || !game_dir.is_dir() {
        return Ok(GameDetectionResult {
            success: false,
            r#type: None,
            executable: None,
            game_name: None,
            version: None,
            md5: None,
            error: Some("指定的路径不存在或不是文件夹".to_string()),
        });
    }

    // 检测游戏主程序
    let game_executables = [
        ("gta3.exe", "Grand Theft Auto III"),
        ("gta-vc.exe", "Grand Theft Auto: Vice City"),
        ("gtasa.exe", "Grand Theft Auto: San Andreas"),
        ("gta-sa.exe", "Grand Theft Auto: San Andreas"),
        ("gta_sa.exe", "Grand Theft Auto: San Andreas"),
    ];

    for (exe_name, game_name) in &game_executables {
        let exe_path = game_dir.join(exe_name);
        if exe_path.exists() && exe_path.is_file() {
            // 使用统一的游戏类型识别函数
            let game_type = detect_game_type_from_exe(exe_name);

            // 计算MD5值
            let md5_result = calculate_file_md5(&exe_path);
            let md5 = md5_result.ok();

            // 根据MD5识别版本
            let version =
                if let (Some(ref gt), Some(ref md5_hash)) = (game_type.as_ref(), md5.as_ref()) {
                    get_game_version_from_md5(gt, md5_hash)
                } else {
                    None
                };

            return Ok(GameDetectionResult {
                success: true,
                r#type: game_type,
                executable: Some(exe_name.to_string()),
                game_name: Some(game_name.to_string()),
                version,
                md5,
                error: None,
            });
        }
    }

    Ok(GameDetectionResult {
        success: true,
        r#type: None,
        executable: None,
        game_name: None,
        version: None,
        md5: None,
        error: None,
    })
}

// 游戏启动功能
#[tauri::command]
pub async fn launch_game(
    game_dir: String,
    executable: String,
    run_as_admin: Option<bool>,
) -> Result<ApiResponse<()>, String> {
    let game_path = Path::new(&game_dir);
    let exe_path = game_path.join(&executable);

    // 检查游戏目录是否存在
    if !game_path.exists() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    // 检查可执行文件是否存在
    if !exe_path.exists() {
        return Ok(ApiResponse::error(format!(
            "游戏可执行文件不存在: {}",
            executable
        )));
    }

    // 启动游戏进程
    let result = if cfg!(target_os = "windows") && run_as_admin.unwrap_or(false) {
        // 在 Windows 上以管理员权限启动
        launch_with_admin_privileges(&exe_path, &game_path)
    } else {
        // 普通启动
        Command::new(&exe_path).current_dir(&game_path).spawn()
    };

    match result {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => {
            // 检查是否是权限错误 (os error 740)
            if e.raw_os_error() == Some(740) {
                Ok(ApiResponse::error(
                    "启动游戏需要管理员权限。请尝试以管理员身份运行G2M。".to_string(),
                ))
            } else {
                Ok(ApiResponse::error(format!("启动游戏失败: {}", e)))
            }
        }
    }
}

// Windows 管理员权限启动辅助函数
#[cfg(target_os = "windows")]
fn launch_with_admin_privileges(
    exe_path: &Path,
    working_dir: &Path,
) -> std::io::Result<std::process::Child> {
    // 使用 PowerShell 的 Start-Process 命令以管理员权限启动
    Command::new("powershell")
        .args(&[
            "-Command",
            &format!(
                "Start-Process -FilePath '{}' -WorkingDirectory '{}' -Verb RunAs",
                exe_path.display(),
                working_dir.display()
            ),
        ])
        .spawn()
}

#[cfg(not(target_os = "windows"))]
fn launch_with_admin_privileges(
    exe_path: &Path,
    working_dir: &Path,
) -> std::io::Result<std::process::Child> {
    // 在非 Windows 系统上，使用 sudo 或直接启动
    Command::new(exe_path).current_dir(working_dir).spawn()
}

// 打开游戏目录命令
#[tauri::command]
pub async fn open_game_folder(game_dir: String) -> Result<ApiResponse<()>, String> {
    let game_path = Path::new(&game_dir);

    // 检查目录是否存在
    if !game_path.exists() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    // 使用 tauri_plugin_opener 打开目录
    match tauri_plugin_opener::open_path(game_path, None::<&str>) {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => Ok(ApiResponse::error(format!("打开目录失败: {}", e))),
    }
}

// 游戏数据存储功能
#[tauri::command]
pub async fn save_game(
    name: String,
    dir: String,
    exe: String,
    img: Option<String>,
    r#type: Option<String>, // 优先使用传入的type参数，如果没有则自动识别
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<()>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    // 确保配置目录存在
    if let Err(e) = fs::create_dir_all(&config_dir) {
        return Ok(ApiResponse::error(format!("创建配置目录失败: {}", e)));
    }

    // 读取现有游戏列表
    let mut game_list = if game_list_path.exists() {
        match fs::read_to_string(&game_list_path) {
            Ok(content) => match serde_json::from_str::<GameList>(&content) {
                Ok(list) => list,
                Err(_) => GameList { games: Vec::new() },
            },
            Err(_) => GameList { games: Vec::new() },
        }
    } else {
        GameList { games: Vec::new() }
    };

    // 检查是否已存在相同目录的游戏
    for existing_game in &game_list.games {
        if existing_game.dir == dir {
            return Ok(ApiResponse::error(format!(
                "游戏目录已存在！已有游戏 \"{}\" 使用了相同的目录路径：{}",
                existing_game.name, dir
            )));
        }
    }

    // 计算新的ID（基于现有游戏数量 + 1）
    let new_id = if game_list.games.is_empty() {
        1
    } else {
        game_list.games.iter().map(|g| g.id).max().unwrap_or(0) + 1
    };

    // 优先使用传入的type参数，如果没有则根据exe文件名自动识别
    let game_type = if let Some(t) = r#type {
        Some(t)
    } else {
        detect_game_type_from_exe(&exe)
    };

    // 计算MD5值和版本
    let game_path = Path::new(&dir);
    let exe_path = game_path.join(&exe);
    let md5 = if exe_path.exists() {
        calculate_file_md5(&exe_path).ok()
    } else {
        None
    };

    let version = if let (Some(ref gt), Some(ref md5_hash)) = (game_type.as_ref(), md5.as_ref()) {
        get_game_version_from_md5(gt, md5_hash)
    } else {
        None
    };

    // 创建新游戏信息
    let new_game = GameInfo {
        id: new_id,
        name,
        time: Utc::now().timestamp_millis().to_string(),
        dir,
        exe,
        img,
        r#type: game_type,
        version,
        md5,
        deleted: false, // 新游戏默认未删除
    };

    // 添加到游戏列表
    game_list.games.push(new_game.clone());

    // 保存到文件
    match serde_json::to_string_pretty(&game_list) {
        Ok(json_content) => {
            if let Err(e) = fs::write(&game_list_path, json_content) {
                return Ok(ApiResponse::error(format!("保存游戏列表失败: {}", e)));
            }
        }
        Err(e) => {
            return Ok(ApiResponse::error(format!("序列化游戏列表失败: {}", e)));
        }
    }

    // 在游戏根目录生成 g2m.json 文件
    write_g2m_json(
        &new_game.dir,
        &new_game.name,
        &new_game.exe,
        &new_game.img,
        &new_game.r#type,
    );

    Ok(ApiResponse::success(()))
}

#[tauri::command]
pub async fn get_games(app_handle: tauri::AppHandle) -> Result<ApiResponse<Vec<GameInfo>>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    if !game_list_path.exists() {
        return Ok(ApiResponse::success(Vec::new()));
    }

    match fs::read_to_string(&game_list_path) {
        Ok(content) => match serde_json::from_str::<GameList>(&content) {
            Ok(game_list) => Ok(ApiResponse::success(game_list.games)),
            Err(e) => Ok(ApiResponse::error(format!("解析游戏列表失败: {}", e))),
        },
        Err(e) => Ok(ApiResponse::error(format!("读取游戏列表失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_game_by_id(
    id: u32,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<GameInfo>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    if !game_list_path.exists() {
        return Ok(ApiResponse::error("游戏列表文件不存在".to_string()));
    }

    match fs::read_to_string(&game_list_path) {
        Ok(content) => match serde_json::from_str::<GameList>(&content) {
            Ok(game_list) => {
                if let Some(game) = game_list.games.iter().find(|g| g.id == id) {
                    Ok(ApiResponse::success(game.clone()))
                } else {
                    Ok(ApiResponse::error("未找到指定的游戏".to_string()))
                }
            }
            Err(e) => Ok(ApiResponse::error(format!("解析游戏列表失败: {}", e))),
        },
        Err(e) => Ok(ApiResponse::error(format!("读取游戏列表失败: {}", e))),
    }
}

#[tauri::command]
pub async fn update_game(
    id: u32,
    name: String,
    dir: String,
    exe: String,
    img: Option<String>,
    r#type: Option<String>,
    deleted: Option<bool>,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<()>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    if !game_list_path.exists() {
        return Ok(ApiResponse::error("游戏列表文件不存在".to_string()));
    }

    // 读取现有游戏列表
    let mut game_list = match fs::read_to_string(&game_list_path) {
        Ok(content) => match serde_json::from_str::<GameList>(&content) {
            Ok(list) => list,
            Err(e) => return Ok(ApiResponse::error(format!("解析游戏列表失败: {}", e))),
        },
        Err(e) => return Ok(ApiResponse::error(format!("读取游戏列表失败: {}", e))),
    };

    // 查找并更新游戏信息
    if let Some(game) = game_list.games.iter_mut().find(|g| g.id == id) {
        // 保存旧目录，用于检查是否需要删除旧的 g2m.json
        let old_dir = game.dir.clone();

        game.name = name.clone();
        game.dir = dir.clone();
        game.exe = exe.clone();
        game.img = img.clone();
        game.r#type = r#type.clone();
        if let Some(deleted_value) = deleted {
            game.deleted = deleted_value;
        }

        // 重新计算MD5和版本（如果目录和exe发生变化）
        let game_path = Path::new(&dir);
        let exe_path = game_path.join(&exe);
        if exe_path.exists() {
            if let Ok(md5_hash) = calculate_file_md5(&exe_path) {
                game.md5 = Some(md5_hash.clone());
                // 根据MD5识别版本
                let detected_type = detect_game_type_from_exe(&exe);
                let game_type_for_version = r#type.as_deref().or(detected_type.as_deref());
                if let Some(gt) = game_type_for_version {
                    game.version = get_game_version_from_md5(gt, &md5_hash);
                }
            }
        }

        // 保存更新后的游戏列表
        match serde_json::to_string_pretty(&game_list) {
            Ok(json_content) => {
                if let Err(e) = fs::write(&game_list_path, json_content) {
                    return Ok(ApiResponse::error(format!("保存游戏列表失败: {}", e)));
                }
            }
            Err(e) => {
                return Ok(ApiResponse::error(format!("序列化游戏列表失败: {}", e)));
            }
        }

        // 更新 g2m.json 文件
        // 如果目录改变了，删除旧目录的 g2m.json（如果存在）
        if old_dir != dir {
            let old_game_path = Path::new(&old_dir);
            let old_g2m_json_path = old_game_path.join("g2m.json");
            if old_g2m_json_path.exists() {
                let _ = fs::remove_file(&old_g2m_json_path);
            }
        }

        // 在新目录（或当前目录）写入 g2m.json
        write_g2m_json(&dir, &name, &exe, &img, &r#type);

        Ok(ApiResponse::success(()))
    } else {
        Ok(ApiResponse::error("未找到指定的游戏".to_string()))
    }
}

#[tauri::command]
pub async fn delete_game(id: u32, app_handle: tauri::AppHandle) -> Result<ApiResponse<()>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    if !game_list_path.exists() {
        return Ok(ApiResponse::error("游戏列表文件不存在".to_string()));
    }

    // 读取现有游戏列表
    let mut game_list = match fs::read_to_string(&game_list_path) {
        Ok(content) => match serde_json::from_str::<GameList>(&content) {
            Ok(list) => list,
            Err(e) => return Ok(ApiResponse::error(format!("解析游戏列表失败: {}", e))),
        },
        Err(e) => return Ok(ApiResponse::error(format!("读取游戏列表失败: {}", e))),
    };

    // 查找要删除的游戏
    let initial_len = game_list.games.len();
    game_list.games.retain(|game| game.id != id);

    // 检查是否找到并删除了游戏
    if game_list.games.len() == initial_len {
        return Ok(ApiResponse::error("未找到指定的游戏".to_string()));
    }

    // 保存更新后的游戏列表
    match serde_json::to_string_pretty(&game_list) {
        Ok(json_content) => {
            if let Err(e) = fs::write(&game_list_path, json_content) {
                return Ok(ApiResponse::error(format!("保存游戏列表失败: {}", e)));
            }
        }
        Err(e) => {
            return Ok(ApiResponse::error(format!("序列化游戏列表失败: {}", e)));
        }
    }

    Ok(ApiResponse::success(()))
}

#[tauri::command]
pub async fn check_duplicate_directory(
    dir: String,
    app_handle: tauri::AppHandle,
    exclude_game_id: Option<u32>,
) -> Result<ApiResponse<bool>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(e)),
    };

    let game_list_path = config_dir.join("GameList.json");

    // 读取现有游戏列表
    let game_list = if game_list_path.exists() {
        match fs::read_to_string(&game_list_path) {
            Ok(content) => match serde_json::from_str::<GameList>(&content) {
                Ok(list) => list,
                Err(_) => GameList { games: Vec::new() },
            },
            Err(_) => GameList { games: Vec::new() },
        }
    } else {
        GameList { games: Vec::new() }
    };

    // 检查是否已存在相同目录的游戏（排除指定游戏ID）
    for existing_game in &game_list.games {
        // 如果指定了排除的游戏ID，且当前游戏就是被排除的游戏，则跳过
        if let Some(exclude_id) = exclude_game_id {
            if existing_game.id == exclude_id {
                continue;
            }
        }

        if existing_game.dir == dir {
            return Ok(ApiResponse::error(format!(
                "游戏目录已存在！已有游戏 \"{}\" 使用了相同的目录路径",
                existing_game.name
            )));
        }
    }

    Ok(ApiResponse::success(false)) // false 表示没有重复
}

// 图片处理功能
#[tauri::command]
pub async fn copy_game_image(
    source_path: String,
    _game_id: u32,
    _game_name: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<CopyImageResponse>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(format!("获取配置目录失败: {}", e))),
    };

    // 创建自定义图片目录 - 修改为 G2M\Custom\Img
    let custom_img_dir = config_dir
        .parent()
        .ok_or("无法获取父目录")?
        .join("G2M")
        .join("Custom")
        .join("Img");
    if let Err(e) = fs::create_dir_all(&custom_img_dir) {
        return Ok(ApiResponse::error(format!("创建图片目录失败: {}", e)));
    }

    // 验证源文件是否存在
    let source_path = Path::new(&source_path);
    if !source_path.exists() {
        return Ok(ApiResponse::error("源图片文件不存在".to_string()));
    }

    // 获取文件扩展名
    let extension = match source_path.extension() {
        Some(ext) => ext.to_string_lossy().to_lowercase(),
        None => return Ok(ApiResponse::error("无法获取文件扩展名".to_string())),
    };

    // 验证图片格式
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    if !valid_extensions.contains(&extension.as_str()) {
        return Ok(ApiResponse::error(format!(
            "不支持的图片格式: {}。支持的格式: {}",
            extension,
            valid_extensions.join(", ")
        )));
    }

    // 验证文件大小（限制为10MB）
    let metadata = match fs::metadata(source_path) {
        Ok(meta) => meta,
        Err(e) => return Ok(ApiResponse::error(format!("读取文件信息失败: {}", e))),
    };

    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
    if metadata.len() > MAX_FILE_SIZE {
        return Ok(ApiResponse::error("图片文件大小不能超过10MB".to_string()));
    }

    // 生成新文件名：随机字符串+时间戳.扩展名
    let timestamp = Utc::now().timestamp();
    let random_string: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10)
        .map(char::from)
        .collect();

    let new_filename = format!("{}_{}.{}", random_string, timestamp, extension);

    let dest_path = custom_img_dir.join(&new_filename);

    // 复制文件
    if let Err(e) = fs::copy(source_path, &dest_path) {
        return Ok(ApiResponse::error(format!("复制图片文件失败: {}", e)));
    }

    // 返回相对路径（相对于配置目录）
    let relative_path = format!("Custom/Img/{}", new_filename);

    Ok(ApiResponse::success(CopyImageResponse {
        image_path: relative_path,
    }))
}

// MOD 前置安装功能 - 支持选择性安装
#[tauri::command]
pub async fn install_mod_prerequisites(
    request: ModInstallRequest,
    _app_handle: tauri::AppHandle,
) -> Result<ApiResponse<ModInstallResult>, String> {
    let game_path = Path::new(&request.game_dir);

    if !game_path.exists() || !game_path.is_dir() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }

    // 获取 G2M/Module 目录路径
    let module_dir = if cfg!(debug_assertions) {
        // 在开发环境中，使用项目根目录
        let current_dir =
            std::env::current_dir().map_err(|e| format!("获取当前目录失败: {}", e))?;

        // 如果当前目录是 src-tauri，则向上找到项目根目录
        let project_root = if current_dir
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name == "src-tauri")
            .unwrap_or(false)
        {
            current_dir
                .parent()
                .ok_or("无法获取项目根目录")?
                .to_path_buf()
        } else {
            current_dir
        };

        project_root.join("src-tauri").join("G2M").join("Module")
    } else {
        // 在生产环境中，使用exe文件所在目录
        let exe_dir = std::env::current_exe()
            .map_err(|e| format!("获取程序路径失败: {}", e))?
            .parent()
            .ok_or("无法获取程序目录")?
            .to_path_buf();
        exe_dir.join("G2M").join("Module")
    };

    if !module_dir.exists() {
        return Ok(ApiResponse::error(format!(
            "G2M/Module 目录不存在: {}",
            module_dir.display()
        )));
    }

    let mut installed_files = Vec::new();
    let mut created_directories = Vec::new();

    // 确定要安装的组件
    let components_to_install = if let Some(components) = &request.components {
        components.clone()
    } else {
        // 如果没有指定组件，安装默认组件
        vec!["dinput8".to_string(), "cleo".to_string()]
    };

    println!("准备安装组件: {:?}", components_to_install);

    // 创建 plugins 文件夹（如果需要）
    let plugins_dir = game_path.join("plugins");
    let mut plugins_created = false;

    // 安装 dinput8.dll
    if components_to_install.contains(&"dinput8".to_string()) {
        let dinput8_source = module_dir.join("dinput8.dll");
        let dinput8_dest = game_path.join("dinput8.dll");

        if dinput8_source.exists() {
            if let Err(e) = fs::copy(&dinput8_source, &dinput8_dest) {
                return Ok(ApiResponse::error(format!("复制 dinput8.dll 失败: {}", e)));
            }
            installed_files.push("dinput8.dll".to_string());
            println!("已安装: dinput8.dll");
        } else {
            return Ok(ApiResponse::error("dinput8.dll 文件不存在".to_string()));
        }
    }

    // 安装 CLEO
    if components_to_install.contains(&"cleo".to_string()) {
        // 确保 plugins 目录存在
        if !plugins_created && !plugins_dir.exists() {
            if let Err(e) = fs::create_dir_all(&plugins_dir) {
                return Ok(ApiResponse::error(format!("创建 plugins 目录失败: {}", e)));
            }
            created_directories.push("plugins".to_string());
            plugins_created = true;
        }

        match request.game_type.as_str() {
            "gta3" => {
                let cleo3_dir = module_dir.join("CLEO.III_v2.1.1");
                if cleo3_dir.exists() {
                    // 复制 III.CLEO.asi 到 plugins 目录
                    let asi_source = cleo3_dir.join("III.CLEO.asi");
                    let asi_dest = plugins_dir.join("III.CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!(
                                "复制 III.CLEO.asi 失败: {}",
                                e
                            )));
                        }
                        installed_files.push("plugins/III.CLEO.asi".to_string());
                    }

                    // 复制 CLEO 文件夹到游戏根目录
                    let cleo_source = cleo3_dir.join("CLEO");
                    let cleo_dest = game_path.join("CLEO");
                    if cleo_source.exists() {
                        if let Err(e) = copy_dir_all(&cleo_source, &cleo_dest) {
                            return Ok(ApiResponse::error(format!("复制 CLEO 目录失败: {}", e)));
                        }
                        created_directories.push("CLEO".to_string());
                    }
                    println!("已安装: CLEO for GTA III");
                }
            }
            "gtavc" => {
                let cleovc_dir = module_dir.join("CLEO.VC_v2.1.1");
                if cleovc_dir.exists() {
                    // 复制 VC.CLEO.asi 到 plugins 目录
                    let asi_source = cleovc_dir.join("VC.CLEO.asi");
                    let asi_dest = plugins_dir.join("VC.CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!("复制 VC.CLEO.asi 失败: {}", e)));
                        }
                        installed_files.push("plugins/VC.CLEO.asi".to_string());
                    }

                    // 复制 CLEO 文件夹到游戏根目录
                    let cleo_source = cleovc_dir.join("CLEO");
                    let cleo_dest = game_path.join("CLEO");
                    if cleo_source.exists() {
                        if let Err(e) = copy_dir_all(&cleo_source, &cleo_dest) {
                            return Ok(ApiResponse::error(format!("复制 CLEO 目录失败: {}", e)));
                        }
                        created_directories.push("CLEO".to_string());
                    }
                    println!("已安装: CLEO for GTA Vice City");
                }
            }
            "gtasa" => {
                let cleosa_dir = module_dir.join("CLEO.SA_v4.44");
                if cleosa_dir.exists() {
                    // 复制 CLEO.asi 到 plugins 目录
                    let asi_source = cleosa_dir.join("CLEO.asi");
                    let asi_dest = plugins_dir.join("CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!("复制 CLEO.asi 失败: {}", e)));
                        }
                        installed_files.push("plugins/CLEO.asi".to_string());
                    }

                    // 复制相关 DLL 文件到游戏根目录
                    let dll_files = ["bass.dll", "vorbisFile.dll", "vorbisHooked.dll"];
                    for dll_file in &dll_files {
                        let dll_source = cleosa_dir.join(dll_file);
                        let dll_dest = game_path.join(dll_file);
                        if dll_source.exists() {
                            if let Err(e) = fs::copy(&dll_source, &dll_dest) {
                                return Ok(ApiResponse::error(format!(
                                    "复制 {} 失败: {}",
                                    dll_file, e
                                )));
                            }
                            installed_files.push(dll_file.to_string());
                        }
                    }

                    // 复制 cleo 文件夹到游戏根目录
                    let cleo_source = cleosa_dir.join("cleo");
                    let cleo_dest = game_path.join("cleo");
                    if cleo_source.exists() {
                        if let Err(e) = copy_dir_all(&cleo_source, &cleo_dest) {
                            return Ok(ApiResponse::error(format!("复制 cleo 目录失败: {}", e)));
                        }
                        created_directories.push("cleo".to_string());
                    }

                    // 复制 scripts 文件夹到游戏根目录
                    let scripts_source = cleosa_dir.join("scripts");
                    let scripts_dest = game_path.join("scripts");
                    if scripts_source.exists() {
                        if let Err(e) = copy_dir_all(&scripts_source, &scripts_dest) {
                            return Ok(ApiResponse::error(format!("复制 scripts 目录失败: {}", e)));
                        }
                        created_directories.push("scripts".to_string());
                    }

                    // 复制 cleo_sdk 文件夹到游戏根目录
                    let sdk_source = cleosa_dir.join("cleo_sdk");
                    let sdk_dest = game_path.join("cleo_sdk");
                    if sdk_source.exists() {
                        if let Err(e) = copy_dir_all(&sdk_source, &sdk_dest) {
                            return Ok(ApiResponse::error(format!(
                                "复制 cleo_sdk 目录失败: {}",
                                e
                            )));
                        }
                        created_directories.push("cleo_sdk".to_string());
                    }
                    println!("已安装: CLEO for GTA San Andreas");
                }
            }
            _ => {
                println!("警告: 游戏类型 {} 不支持 CLEO", request.game_type);
            }
        }
    }

    // 安装 CLEO Redux
    if components_to_install.contains(&"cleo_redux".to_string()) {
        // 确保 plugins 目录存在
        if !plugins_created && !plugins_dir.exists() {
            if let Err(e) = fs::create_dir_all(&plugins_dir) {
                return Ok(ApiResponse::error(format!("创建 plugins 目录失败: {}", e)));
            }
            created_directories.push("plugins".to_string());
            plugins_created = true;
        }

        let cleo_redux_dir = module_dir.join("CLEO.Redux_v1.3.3");
        if cleo_redux_dir.exists() {
            // 复制 cleo_redux.asi 到 plugins 目录
            let asi_source = cleo_redux_dir.join("cleo_redux.asi");
            let asi_dest = plugins_dir.join("cleo_redux.asi");
            if asi_source.exists() {
                if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                    println!("警告: 复制 cleo_redux.asi 失败: {}", e);
                } else {
                    installed_files.push("plugins/cleo_redux.asi".to_string());
                }
            }

            // 复制 CLEO 文件夹到游戏根目录（如果不存在）
            let cleo_source = cleo_redux_dir.join("CLEO");
            let cleo_dest = game_path.join("CLEO");
            if cleo_source.exists() && !cleo_dest.exists() {
                if let Err(e) = copy_dir_all(&cleo_source, &cleo_dest) {
                    println!("警告: 复制 CLEO Redux 目录失败: {}", e);
                } else {
                    created_directories.push("CLEO (Redux)".to_string());
                }
            }
            println!("已安装: CLEO Redux");
        }
    }

    // 安装 ModLoader（适用于所有游戏类型）
    if components_to_install.contains(&"modloader".to_string()) {
        let modloader_dir = module_dir.join("ModLoader");
        if !modloader_dir.exists() {
            return Ok(ApiResponse::error("ModLoader 模块目录不存在".to_string()));
        }

        // 确定 modloader.asi 的安装目录：优先使用 plugins，如果不存在则使用 scripts
        let scripts_dir = game_path.join("scripts");
        let asi_dest_dir = if plugins_dir.exists() {
            // 如果 plugins 目录存在，使用 plugins
            if !plugins_created && !plugins_dir.exists() {
                if let Err(e) = fs::create_dir_all(&plugins_dir) {
                    return Ok(ApiResponse::error(format!("创建 plugins 目录失败: {}", e)));
                }
                created_directories.push("plugins".to_string());
            }
            plugins_dir.clone()
        } else if scripts_dir.exists() {
            // 如果 scripts 目录存在，使用 scripts
            if let Err(e) = fs::create_dir_all(&scripts_dir) {
                return Ok(ApiResponse::error(format!("创建 scripts 目录失败: {}", e)));
            }
            created_directories.push("scripts".to_string());
            scripts_dir
        } else {
            // 默认使用 plugins 目录
            if !plugins_created && !plugins_dir.exists() {
                if let Err(e) = fs::create_dir_all(&plugins_dir) {
                    return Ok(ApiResponse::error(format!("创建 plugins 目录失败: {}", e)));
                }
                created_directories.push("plugins".to_string());
            }
            plugins_dir.clone()
        };

        // 复制 modloader.asi 到目标目录
        let asi_source = modloader_dir.join("modloader.asi");
        let asi_dest = asi_dest_dir.join("modloader.asi");
        if asi_source.exists() {
            if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                return Ok(ApiResponse::error(format!(
                    "复制 modloader.asi 失败: {}",
                    e
                )));
            }
            let dest_path_str = if asi_dest_dir == plugins_dir {
                "plugins/modloader.asi".to_string()
            } else {
                "scripts/modloader.asi".to_string()
            };
            installed_files.push(dest_path_str);
        } else {
            return Ok(ApiResponse::error("modloader.asi 文件不存在".to_string()));
        }

        // 复制 modloader 文件夹到游戏根目录
        let modloader_source = modloader_dir.join("modloader");
        let modloader_dest = game_path.join("modloader");
        if modloader_source.exists() {
            if let Err(e) = copy_dir_all(&modloader_source, &modloader_dest) {
                return Ok(ApiResponse::error(format!(
                    "复制 modloader 目录失败: {}",
                    e
                )));
            }
            created_directories.push("modloader".to_string());
        }

        println!(
            "已安装: ModLoader (到 {} 目录)",
            if asi_dest_dir == plugins_dir {
                "plugins"
            } else {
                "scripts"
            }
        );
    }

    let result = ModInstallResult {
        installed_files,
        created_directories,
    };

    println!(
        "安装完成，已安装 {} 个文件，创建 {} 个目录",
        result.installed_files.len(),
        result.created_directories.len()
    );

    Ok(ApiResponse::success(result))
}

// 递归复制目录的辅助函数
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

// 辅助函数：不区分大小写检查目录中的文件
fn find_file_case_insensitive(dir: &Path, target_name: &str) -> Option<(PathBuf, String)> {
    if !dir.exists() || !dir.is_dir() {
        return None;
    }

    let target_lower = target_name.to_lowercase();

    // 读取目录
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    let file_name = entry.file_name();
                    let file_name_str = file_name.to_string_lossy();

                    // 不区分大小写比较
                    if file_name_str.to_lowercase() == target_lower {
                        return Some((entry.path(), file_name_str.to_string()));
                    }
                }
            }
        }
    }

    None
}

// MOD 前置检查功能
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
    // 1. 检查根目录是否存在 modloader 文件夹（不区分大小写）
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

    // 2. 检查所有可能目录中的 modloader.asi（根目录、plugins目录、scripts目录）
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
                    if !has_cleo {
                        has_cleo = true;
                        found_loaders.push(format!("CLEO ({}/{})", dir_name, binding.file_name));
                        missing_loaders.retain(|x| x != "CLEO");
                    }
                }
                "cleo_redux" => {
                    if !has_cleo_redux {
                        has_cleo_redux = true;
                        found_loaders.push(format!("CLEO Redux ({}/{})", dir_name, binding.file_name));
                        missing_loaders.retain(|x| x != "CLEO Redux");
                    }
                }
                "modloader" => {
                    if !has_modloader {
                        has_modloader = true;
                        found_loaders.push(format!("ModLoader ({}/{})", dir_name, binding.file_name));
                        missing_loaders.retain(|x| x != "ModLoader");
                    }
                }
                "dinput8" => {
                    if !has_dinput8 {
                        has_dinput8 = true;
                        found_loaders.push(format!("dinput8.dll ({}/{})", dir_name, binding.file_name));
                        missing_loaders.retain(|x| x != "dinput8.dll");
                    }
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
            found_loaders.push(format!("{} ({}/{})", custom_prereq.name, dir_name, files_str));
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
    app_handle: tauri::AppHandle,
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

// 选择多个文件或文件夹（用于自定义前置）
#[tauri::command]
pub async fn select_custom_prerequisite_files(
    app_handle: tauri::AppHandle,
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
    let file_path_abs = loader_file_path.canonicalize().map_err(|e| {
        format!("无法获取文件绝对路径: {}", e)
    })?;
    let game_path_abs = game_path.canonicalize().map_err(|e| {
        format!("无法获取游戏目录绝对路径: {}", e)
    })?;

    if !file_path_abs.starts_with(&game_path_abs) {
        return Ok(ApiResponse::error("文件必须在游戏目录或其子目录中".to_string()));
    }

    // 计算相对路径
    let relative_path = file_path_abs.strip_prefix(&game_path_abs)
        .map_err(|_| "无法计算相对路径".to_string())?;
    
    let relative_path_str = relative_path.to_string_lossy().to_string();
    let file_name = relative_path.file_name()
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
    save_manual_bindings(&game_dir, &bindings)
        .map_err(|e| format!("保存手动绑定失败: {}", e))?;

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
    save_manual_bindings(&game_dir, &bindings)
        .map_err(|e| format!("保存手动绑定失败: {}", e))?;

    // 重新检查 MOD 加载器状态
    let status_result = check_mod_loaders(game_dir.clone(), None).await?;

    Ok(status_result)
}

// 获取自定义前置列表文件路径
fn get_custom_prerequisites_path(game_dir: &str) -> PathBuf {
    Path::new(game_dir).join("g2m_custom_prerequisites.json")
}

// 获取手动绑定列表文件路径
fn get_manual_bindings_path(game_dir: &str) -> PathBuf {
    Path::new(game_dir).join("g2m_manual_bindings.json")
}

// 读取手动绑定列表
fn load_manual_bindings(game_dir: &str) -> Vec<ManualLoaderBinding> {
    let bindings_path = get_manual_bindings_path(game_dir);
    if !bindings_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&bindings_path) {
        Ok(content) => {
            match serde_json::from_str::<Vec<ManualLoaderBinding>>(&content) {
                Ok(bindings) => bindings,
                Err(e) => {
                    eprintln!("解析手动绑定列表失败: {}", e);
                    Vec::new()
                }
            }
        }
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
        Ok(json_content) => {
            fs::write(&bindings_path, json_content)
                .map_err(|e| format!("保存手动绑定列表失败: {}", e))
        }
        Err(e) => Err(format!("序列化手动绑定列表失败: {}", e)),
    }
}

// 读取自定义前置列表
fn load_custom_prerequisites(game_dir: &str) -> Vec<CustomPrerequisiteInfo> {
    let prereq_path = get_custom_prerequisites_path(game_dir);
    if !prereq_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&prereq_path) {
        Ok(content) => {
            match serde_json::from_str::<Vec<CustomPrerequisiteInfo>>(&content) {
                Ok(prereqs) => prereqs,
                Err(e) => {
                    eprintln!("解析自定义前置列表失败: {}", e);
                    Vec::new()
                }
            }
        }
        Err(e) => {
            eprintln!("读取自定义前置列表失败: {}", e);
            Vec::new()
        }
    }
}

// 保存自定义前置列表
fn save_custom_prerequisites(game_dir: &str, prereqs: &[CustomPrerequisiteInfo]) -> Result<(), String> {
    let prereq_path = get_custom_prerequisites_path(game_dir);
    match serde_json::to_string_pretty(prereqs) {
        Ok(json_content) => {
            fs::write(&prereq_path, json_content)
                .map_err(|e| format!("保存自定义前置列表失败: {}", e))
        }
        Err(e) => Err(format!("序列化自定义前置列表失败: {}", e)),
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
            return Ok(ApiResponse::error(format!("源路径不存在: {}", source_path_str)));
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
    if let Some(existing) = custom_prereqs.iter_mut().find(|p| p.name == custom_prereq.name) {
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

// 修改检测函数，也检查自定义MOD
// 在 check_mod_loaders 函数中添加自定义MOD检查
// 这个需要在 check_mod_loaders 函数内部添加

// 处理base64图片数据的API
#[tauri::command]
pub async fn save_base64_image(
    base64_data: String,
    file_name: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<CopyImageResponse>, String> {
    use base64::{engine::general_purpose, Engine as _};

    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(format!("获取配置目录失败: {}", e))),
    };

    // 创建自定义图片目录
    let custom_img_dir = config_dir.join("Custom").join("Img");
    if let Err(e) = fs::create_dir_all(&custom_img_dir) {
        return Ok(ApiResponse::error(format!("创建图片目录失败: {}", e)));
    }

    // 解码 base64 数据
    let image_data = match general_purpose::STANDARD.decode(&base64_data) {
        Ok(data) => data,
        Err(e) => return Ok(ApiResponse::error(format!("解码图片数据失败: {}", e))),
    };

    // 验证文件大小（限制为10MB）
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if image_data.len() > MAX_FILE_SIZE {
        return Ok(ApiResponse::error("图片文件大小不能超过10MB".to_string()));
    }

    // 获取文件扩展名
    let extension = match Path::new(&file_name).extension() {
        Some(ext) => ext.to_string_lossy().to_lowercase(),
        None => return Ok(ApiResponse::error("无法获取文件扩展名".to_string())),
    };

    // 验证图片格式
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    if !valid_extensions.contains(&extension.as_str()) {
        return Ok(ApiResponse::error(format!(
            "不支持的图片格式: {}。支持的格式: {}",
            extension,
            valid_extensions.join(", ")
        )));
    }

    // 生成唯一文件名
    let random_string: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();

    let new_file_name = format!(
        "{}_{}.{}",
        Path::new(&file_name)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy(),
        random_string,
        extension
    );

    let target_path = custom_img_dir.join(&new_file_name);

    // 保存图片文件
    if let Err(e) = fs::write(&target_path, &image_data) {
        return Ok(ApiResponse::error(format!("保存图片文件失败: {}", e)));
    }

    // 返回相对路径
    let relative_path = format!("G2M/Custom/Img/{}", new_file_name);
    Ok(ApiResponse::success(CopyImageResponse {
        image_path: relative_path,
    }))
}

#[tauri::command]
pub async fn copy_image_to_custom_dir(
    source_path: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<CopyImageResponse>, String> {
    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(format!("获取配置目录失败: {}", e))),
    };

    // 创建自定义图片目录 - G2M\Custom\Img
    let custom_img_dir = config_dir
        .parent()
        .ok_or("无法获取父目录")?
        .join("G2M")
        .join("Custom")
        .join("Img");
    if let Err(e) = fs::create_dir_all(&custom_img_dir) {
        return Ok(ApiResponse::error(format!("创建图片目录失败: {}", e)));
    }

    // 验证源文件是否存在
    let source_path_buf = Path::new(&source_path);
    if !source_path_buf.exists() {
        return Ok(ApiResponse::error("源图片文件不存在".to_string()));
    }

    // 验证文件大小（限制为10MB）
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
    match fs::metadata(&source_path_buf) {
        Ok(metadata) => {
            if metadata.len() > MAX_FILE_SIZE {
                return Ok(ApiResponse::error("图片文件大小不能超过10MB".to_string()));
            }
        }
        Err(e) => return Ok(ApiResponse::error(format!("无法读取文件信息: {}", e))),
    }

    // 获取文件扩展名
    let extension = match source_path_buf.extension() {
        Some(ext) => ext.to_string_lossy().to_lowercase(),
        None => return Ok(ApiResponse::error("无法获取文件扩展名".to_string())),
    };

    // 验证图片格式
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    if !valid_extensions.contains(&extension.as_str()) {
        return Ok(ApiResponse::error(format!(
            "不支持的图片格式: {}。支持的格式: {}",
            extension,
            valid_extensions.join(", ")
        )));
    }

    // 获取原始文件名（不含扩展名）
    let original_name = source_path_buf
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();

    // 生成唯一文件名
    let random_string: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();

    let new_file_name = format!("{}_{}.{}", original_name, random_string, extension);
    let target_path = custom_img_dir.join(&new_file_name);

    // 复制图片文件
    if let Err(e) = fs::copy(&source_path_buf, &target_path) {
        return Ok(ApiResponse::error(format!("复制图片文件失败: {}", e)));
    }

    // 返回相对路径
    let relative_path = format!("G2M/Custom/Img/{}", new_file_name);
    Ok(ApiResponse::success(CopyImageResponse {
        image_path: relative_path,
    }))
}

#[tauri::command]
pub async fn select_image_file(
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app_handle
        .dialog()
        .file()
        .set_title("选择游戏封面图片")
        .add_filter("图片文件", &["jpg", "jpeg", "png", "gif", "bmp", "webp"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });

    match rx.recv() {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            Ok(ApiResponse::success(path_str))
        }
        Ok(None) => Ok(ApiResponse::error("用户取消了文件选择".to_string())),
        Err(_) => Ok(ApiResponse::error("文件选择失败".to_string())),
    }
}

#[tauri::command]
pub async fn process_image_upload(
    file_name: String,
    file_data: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<CopyImageResponse>, String> {
    use base64::{engine::general_purpose, Engine as _};

    // 获取配置目录
    let config_dir = match get_config_dir(&app_handle) {
        Ok(dir) => dir,
        Err(e) => return Ok(ApiResponse::error(format!("获取配置目录失败: {}", e))),
    };

    // 创建自定义图片目录
    let custom_img_dir = config_dir.join("Custom").join("Img");
    if let Err(e) = fs::create_dir_all(&custom_img_dir) {
        return Ok(ApiResponse::error(format!("创建图片目录失败: {}", e)));
    }

    // 解码 base64 数据
    let image_data = match general_purpose::STANDARD.decode(&file_data) {
        Ok(data) => data,
        Err(e) => return Ok(ApiResponse::error(format!("解码图片数据失败: {}", e))),
    };

    // 验证文件大小（限制为10MB）
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if image_data.len() > MAX_FILE_SIZE {
        return Ok(ApiResponse::error("图片文件大小不能超过10MB".to_string()));
    }

    // 获取文件扩展名
    let extension = match Path::new(&file_name).extension() {
        Some(ext) => ext.to_string_lossy().to_lowercase(),
        None => return Ok(ApiResponse::error("无法获取文件扩展名".to_string())),
    };

    // 验证图片格式
    let valid_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    if !valid_extensions.contains(&extension.as_str()) {
        return Ok(ApiResponse::error(format!(
            "不支持的图片格式: {}。支持的格式: {}",
            extension,
            valid_extensions.join(", ")
        )));
    }

    // 生成新文件名：随机字符串+时间戳.扩展名
    let timestamp = Utc::now().timestamp();

    // 生成10位随机字母数字字符串
    let random_string: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(10)
        .map(char::from)
        .collect();

    let new_filename = format!("{}_{}.{}", random_string, timestamp, extension);

    let dest_path = custom_img_dir.join(&new_filename);

    // 写入文件
    if let Err(e) = fs::write(&dest_path, &image_data) {
        return Ok(ApiResponse::error(format!("保存图片文件失败: {}", e)));
    }

    // 返回相对路径（相对于配置目录）
    let relative_path = format!("Custom/Img/{}", new_filename);

    Ok(ApiResponse::success(CopyImageResponse {
        image_path: relative_path,
    }))
}
