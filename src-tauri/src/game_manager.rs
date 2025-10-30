use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameInfo {
    pub id: u32,
    pub name: String,
    pub time: String,
    pub dir: String,
    pub exe: String,
    pub img: Option<String>,
    pub game_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameList {
    pub games: Vec<GameInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameDetectionResult {
    pub success: bool,
    pub game_type: Option<String>,
    pub executable: Option<String>,
    pub game_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// 获取配置目录路径（exe文件旁边的G2M/Config目录）
fn get_config_dir(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
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
            game_type: None,
            executable: None,
            game_name: None,
            error: Some("指定的路径不存在或不是文件夹".to_string()),
        });
    }

    // 检测游戏主程序
    let game_executables = [
        ("gta3.exe", "gta3", "Grand Theft Auto III"),
        ("gta-vc.exe", "gtavc", "Grand Theft Auto: Vice City"),
        ("gtasa.exe", "gtasa", "Grand Theft Auto: San Andreas"),
    ];

    for (exe_name, game_type, game_name) in &game_executables {
        let exe_path = game_dir.join(exe_name);
        if exe_path.exists() && exe_path.is_file() {
            return Ok(GameDetectionResult {
                success: true,
                game_type: Some(game_type.to_string()),
                executable: Some(exe_name.to_string()),
                game_name: Some(game_name.to_string()),
                error: None,
            });
        }
    }

    Ok(GameDetectionResult {
        success: true,
        game_type: None,
        executable: None,
        game_name: None,
        error: None,
    })
}

#[tauri::command]
pub async fn save_game(
    name: String,
    dir: String,
    exe: String,
    img: Option<String>,
    game_type: Option<String>,
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

    // 创建新游戏信息
    let new_game = GameInfo {
        id: new_id,
        name,
        time: Utc::now().to_rfc3339(),
        dir,
        exe,
        img,
        game_type,
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
    game_type: Option<String>,
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
        game.game_type = game_type;
        
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