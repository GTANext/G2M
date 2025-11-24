use crate::game::utils::{
    calculate_file_md5, copy_dir_all, detect_game_type_from_exe, get_config_dir,
    get_game_version_from_md5, write_g2m_json,
};
use crate::game::{
    ApiResponse, CopyImageResponse, GameInfo, GameList, ModInstallRequest, ModInstallResult,
};
use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

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

    // 在游戏根目录生成 .gtamodx/info.json 和 .gtamodx/mods.json 文件
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

        // 更新 .gtamodx 目录
        // 如果目录改变了，删除旧目录的 .gtamodx 目录和 g2m.json（如果存在）
        if old_dir != dir {
            let old_game_path = Path::new(&old_dir);
            // 删除旧的 .gtamodx 目录
            let old_g2m_dir = old_game_path.join(".gtamodx");
            if old_g2m_dir.exists() {
                let _ = fs::remove_dir_all(&old_g2m_dir);
            }
            // 删除旧的 g2m.json（如果存在，用于迁移）
            let old_g2m_json_path = old_game_path.join("g2m.json");
            if old_g2m_json_path.exists() {
                let _ = fs::remove_file(&old_g2m_json_path);
            }
        }

        // 在新目录（或当前目录）写入 .gtamodx/info.json 和 .gtamodx/mods.json
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

// 处理base64图片数据的API
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

    // 创建 plugins 和 scripts 文件夹（如果需要）
    let plugins_dir = game_path.join("plugins");
    let scripts_dir = game_path.join("scripts");
    let mut plugins_created = false;

    // 辅助函数：确定 ASI 文件的安装目录（优先级：plugins > scripts > 根目录）
    let determine_asi_install_dir = || -> PathBuf {
        if plugins_dir.exists() {
            plugins_dir.clone()
        } else if scripts_dir.exists() {
            scripts_dir.clone()
        } else {
            // 默认创建并使用 plugins 目录
            game_path.join("plugins")
        }
    };

    // 辅助函数：判断路径是否为 plugins 目录
    let is_plugins_dir = |path: &PathBuf| -> bool {
        path.to_string_lossy().ends_with("plugins") || path.to_string_lossy().contains("plugins")
    };

    // 辅助函数：判断路径是否为 scripts 目录
    let is_scripts_dir = |path: &PathBuf| -> bool {
        path.to_string_lossy().ends_with("scripts") || path.to_string_lossy().contains("scripts")
    };

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
        // 确定 ASI 文件的安装目录（优先级：plugins > scripts > 根目录）
        let asi_dest_dir = determine_asi_install_dir();

        // 确保目标目录存在
        if !asi_dest_dir.exists() {
            if let Err(e) = fs::create_dir_all(&asi_dest_dir) {
                return Ok(ApiResponse::error(format!("创建目录失败: {}", e)));
            }
            // 判断创建的目录类型
            let dir_name = if is_plugins_dir(&asi_dest_dir) {
                plugins_created = true;
                "plugins"
            } else if is_scripts_dir(&asi_dest_dir) {
                "scripts"
            } else {
                "根目录"
            };
            if !created_directories.contains(&dir_name.to_string()) {
                created_directories.push(dir_name.to_string());
            }
        }

        match request.game_type.as_str() {
            "gta3" => {
                let cleo3_dir = module_dir.join("CLEO.III_v2.1.1");
                if cleo3_dir.exists() {
                    // 复制 III.CLEO.asi 到目标目录（plugins/scripts/根目录）
                    let asi_source = cleo3_dir.join("III.CLEO.asi");
                    let asi_dest = asi_dest_dir.join("III.CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!(
                                "复制 III.CLEO.asi 失败: {}",
                                e
                            )));
                        }
                        let dest_path_str = if is_plugins_dir(&asi_dest_dir) {
                            "plugins/III.CLEO.asi".to_string()
                        } else if is_scripts_dir(&asi_dest_dir) {
                            "scripts/III.CLEO.asi".to_string()
                        } else {
                            "III.CLEO.asi".to_string()
                        };
                        installed_files.push(dest_path_str);
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
                    // 复制 VC.CLEO.asi 到目标目录（plugins/scripts/根目录）
                    let asi_source = cleovc_dir.join("VC.CLEO.asi");
                    let asi_dest = asi_dest_dir.join("VC.CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!("复制 VC.CLEO.asi 失败: {}", e)));
                        }
                        let dest_path_str = if is_plugins_dir(&asi_dest_dir) {
                            "plugins/VC.CLEO.asi".to_string()
                        } else if is_scripts_dir(&asi_dest_dir) {
                            "scripts/VC.CLEO.asi".to_string()
                        } else {
                            "VC.CLEO.asi".to_string()
                        };
                        installed_files.push(dest_path_str);
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
                    // 复制 CLEO.asi 到目标目录（plugins/scripts/根目录）
                    let asi_source = cleosa_dir.join("CLEO.asi");
                    let asi_dest = asi_dest_dir.join("CLEO.asi");
                    if asi_source.exists() {
                        if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                            return Ok(ApiResponse::error(format!("复制 CLEO.asi 失败: {}", e)));
                        }
                        let dest_path_str = if is_plugins_dir(&asi_dest_dir) {
                            "plugins/CLEO.asi".to_string()
                        } else if is_scripts_dir(&asi_dest_dir) {
                            "scripts/CLEO.asi".to_string()
                        } else {
                            "CLEO.asi".to_string()
                        };
                        installed_files.push(dest_path_str);
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
        // 确定安装目录（优先级：plugins > scripts > 根目录）
        let redux_dest_dir = determine_asi_install_dir();

        // 确保目标目录存在
        if !redux_dest_dir.exists() {
            if let Err(e) = fs::create_dir_all(&redux_dest_dir) {
                return Ok(ApiResponse::error(format!("创建目录失败: {}", e)));
            }
            let dir_name = if is_plugins_dir(&redux_dest_dir) {
                plugins_created = true;
                "plugins"
            } else if is_scripts_dir(&redux_dest_dir) {
                "scripts"
            } else {
                "根目录"
            };
            if !created_directories.contains(&dir_name.to_string()) {
                created_directories.push(dir_name.to_string());
            }
        }

        let cleo_redux_dir = module_dir.join("CLEO.Redux_v1.3.3");
        if cleo_redux_dir.exists() {
            // 复制 cleo_redux.asi 到目标目录（plugins/scripts/根目录）
            let asi_source = cleo_redux_dir.join("cleo_redux.asi");
            let asi_dest = redux_dest_dir.join("cleo_redux.asi");
            if asi_source.exists() {
                if let Err(e) = fs::copy(&asi_source, &asi_dest) {
                    return Ok(ApiResponse::error(format!(
                        "复制 cleo_redux.asi 失败: {}",
                        e
                    )));
                }
                let dest_path_str = if is_plugins_dir(&redux_dest_dir) {
                    "plugins/cleo_redux.asi".to_string()
                } else if is_scripts_dir(&redux_dest_dir) {
                    "scripts/cleo_redux.asi".to_string()
                } else {
                    "cleo_redux.asi".to_string()
                };
                installed_files.push(dest_path_str);
            }

            // 复制 CLEO 文件夹到目标目录（plugins/scripts/根目录）
            let cleo_source = cleo_redux_dir.join("CLEO");
            let cleo_dest = redux_dest_dir.join("CLEO");
            if cleo_source.exists() {
                if let Err(e) = copy_dir_all(&cleo_source, &cleo_dest) {
                    return Ok(ApiResponse::error(format!(
                        "复制 CLEO Redux 目录失败: {}",
                        e
                    )));
                }
                let dest_dir_name = if is_plugins_dir(&redux_dest_dir) {
                    "plugins/CLEO"
                } else if is_scripts_dir(&redux_dest_dir) {
                    "scripts/CLEO"
                } else {
                    "CLEO"
                };
                created_directories.push(dest_dir_name.to_string());
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
            let dest_path_str = if is_plugins_dir(&asi_dest_dir) {
                "plugins/modloader.asi".to_string()
            } else if is_scripts_dir(&asi_dest_dir) {
                "scripts/modloader.asi".to_string()
            } else {
                "modloader.asi".to_string()
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
            if is_plugins_dir(&asi_dest_dir) {
                "plugins"
            } else if is_scripts_dir(&asi_dest_dir) {
                "scripts"
            } else {
                "根目录"
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

// MOD 前置检查和自定义前置相关功能已移动到 prerequisites.rs 模块

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
