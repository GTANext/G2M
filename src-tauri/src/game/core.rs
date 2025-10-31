use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use chrono::Utc;
use rand::{Rng, thread_rng};
use rand::distributions::Alphanumeric;
use crate::game::{GameInfo, GameList, GameDetectionResult, ApiResponse, CopyImageResponse};

// 根据exe文件名识别游戏类型
fn detect_game_type_from_exe(exe_name: &str) -> Option<String> {
    match exe_name.to_lowercase().as_str() {
        "gta3.exe" => Some("gta3".to_string()),
        "gta-vc.exe" => Some("gtavc".to_string()),
        "gtasa.exe" | "gta-sa.exe" | "gta_sa.exe" => Some("gtasa".to_string()),
        _ => None,
    }
}

// 工具函数
/// 获取配置目录路径
pub fn get_config_dir(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    // 在开发环境中，使用项目根目录
    if cfg!(debug_assertions) {
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("无法获取当前目录: {}", e))?;
        let config_dir = current_dir.join("G2M").join("Config");
        return Ok(config_dir);
    }
    
    // 在生产环境中，使用exe文件所在目录
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("无法获取可执行文件路径: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "无法获取可执行文件所在目录".to_string())?;
    
    let config_dir = exe_dir.join("G2M").join("Config");
    Ok(config_dir)
}

// 游戏检测功
#[tauri::command]
pub async fn select_game_folder(app_handle: tauri::AppHandle) -> Result<ApiResponse<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;
    
    let (tx, rx) = mpsc::channel();
    
    app_handle.dialog().file().set_title("选择游戏文件夹").pick_folder(move |path| {
        let _ = tx.send(path);
    });
    
    match rx.recv() {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            Ok(ApiResponse::success(path_str))
        }
        Ok(None) => Ok(ApiResponse::error("用户取消了文件夹选择".to_string())),
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
            return Ok(GameDetectionResult {
                success: true,
                r#type: game_type,
                executable: Some(exe_name.to_string()),
                game_name: Some(game_name.to_string()),
                error: None,
            });
        }
    }

    Ok(GameDetectionResult {
        success: true,
        r#type: None,
        executable: None,
        game_name: None,
        error: None,
    })
}

// 游戏启动功能
#[tauri::command]
pub async fn launch_game(game_dir: String, executable: String, run_as_admin: Option<bool>) -> Result<ApiResponse<()>, String> {
    let game_path = Path::new(&game_dir);
    let exe_path = game_path.join(&executable);
    
    // 检查游戏目录是否存在
    if !game_path.exists() {
        return Ok(ApiResponse::error("游戏目录不存在".to_string()));
    }
    
    // 检查可执行文件是否存在
    if !exe_path.exists() {
        return Ok(ApiResponse::error(format!("游戏可执行文件不存在: {}", executable)));
    }
    
    // 启动游戏进程
    let result = if cfg!(target_os = "windows") && run_as_admin.unwrap_or(false) {
        // 在 Windows 上以管理员权限启动
        launch_with_admin_privileges(&exe_path, &game_path)
    } else {
        // 普通启动
        Command::new(&exe_path)
            .current_dir(&game_path)
            .spawn()
    };
    
    match result {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => {
            // 检查是否是权限错误 (os error 740)
            if e.raw_os_error() == Some(740) {
                Ok(ApiResponse::error(
                    "启动游戏需要管理员权限。请尝试以管理员身份运行G2M。".to_string()
                ))
            } else {
                Ok(ApiResponse::error(format!("启动游戏失败: {}", e)))
            }
        }
    }
}

// Windows 管理员权限启动辅助函数
#[cfg(target_os = "windows")]
fn launch_with_admin_privileges(exe_path: &Path, working_dir: &Path) -> std::io::Result<std::process::Child> {
    // 使用 PowerShell 的 Start-Process 命令以管理员权限启动
    Command::new("powershell")
        .args(&[
            "-Command",
            &format!(
                "Start-Process -FilePath '{}' -WorkingDirectory '{}' -Verb RunAs",
                exe_path.display(),
                working_dir.display()
            )
        ])
        .spawn()
}

#[cfg(not(target_os = "windows"))]
fn launch_with_admin_privileges(exe_path: &Path, working_dir: &Path) -> std::io::Result<std::process::Child> {
    // 在非 Windows 系统上，使用 sudo 或直接启动
    Command::new(exe_path)
        .current_dir(working_dir)
        .spawn()
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
    _type: Option<String>, // 忽略传入的type参数，使用自动识别
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

    // 根据exe文件名自动识别游戏类型
    let detected_type = detect_game_type_from_exe(&exe);

    // 创建新游戏信息
    let new_game = GameInfo {
        id: new_id,
        name,
        time: Utc::now().to_rfc3339(),
        dir,
        exe,
        img,
        r#type: detected_type,
        deleted: false, // 新游戏默认未删除
    };

    // 添加到游戏列表
    game_list.games.push(new_game);

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
pub async fn get_game_by_id(id: u32, app_handle: tauri::AppHandle) -> Result<ApiResponse<GameInfo>, String> {
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
            },
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
        game.name = name;
        game.dir = dir;
        game.exe = exe;
        game.img = img;
        game.r#type = r#type;
        if let Some(deleted_value) = deleted {
            game.deleted = deleted_value;
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
pub async fn check_duplicate_directory(dir: String, app_handle: tauri::AppHandle) -> Result<ApiResponse<bool>, String> {
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

    // 检查是否已存在相同目录的游戏
    for existing_game in &game_list.games {
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
    let custom_img_dir = config_dir.parent()
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
    
    let new_filename = format!("{}_{}.{}", 
        random_string, 
        timestamp,
        extension
    );
    
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

// 处理base64图片数据的API
#[tauri::command]
pub async fn save_base64_image(
    base64_data: String,
    file_name: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<CopyImageResponse>, String> {
    use base64::{Engine as _, engine::general_purpose};
    
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
    
    let new_file_name = format!("{}_{}.{}", 
        Path::new(&file_name).file_stem().unwrap_or_default().to_string_lossy(),
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
        image_path: relative_path
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
    let custom_img_dir = config_dir.parent()
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
        image_path: relative_path
    }))
}

#[tauri::command]
pub async fn select_image_file(app_handle: tauri::AppHandle) -> Result<ApiResponse<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;
    
    let (tx, rx) = mpsc::channel();
    
    app_handle.dialog()
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
    use base64::{Engine as _, engine::general_purpose};
    
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
    
    let new_filename = format!("{}_{}.{}", 
        random_string, 
        timestamp,
        extension
    );
    
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