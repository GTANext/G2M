use crate::game::types::{G2MGameConfig, G2MModInfo};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

/// 根据exe文件名识别游戏类型
pub fn detect_game_type_from_exe(exe_name: &str) -> Option<String> {
    match exe_name.to_lowercase().as_str() {
        "gta3.exe" => Some("gta3".to_string()),
        "gta-vc.exe" => Some("gtavc".to_string()),
        "gtasa.exe" | "gta-sa.exe" | "gta_sa.exe" => Some("gtasa".to_string()),
        _ => None,
    }
}

/// 计算文件的MD5值
pub fn calculate_file_md5(file_path: &Path) -> Result<String, String> {
    let mut file = std::fs::File::open(file_path).map_err(|e| format!("无法打开文件: {}", e))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let digest = md5::compute(&buffer);
    Ok(format!("{:x}", digest))
}

/// 游戏版本数据库：MD5到版本的映射
/// TODO: 等获取到真实MD5值后再启用版本识别功能
/// 当前暂时返回None，保留MD5计算功能以便后续扩展
pub fn get_game_version_from_md5(_game_type: &str, _md5: &str) -> Option<String> {
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

/// 读取 g2m.json 文件
pub fn read_g2m_json(game_dir: &str) -> Option<G2MGameConfig> {
    let game_path = Path::new(game_dir);
    let g2m_json_path = game_path.join("g2m.json");

    if !g2m_json_path.exists() {
        return None;
    }

    match fs::read_to_string(&g2m_json_path) {
        Ok(content) => match serde_json::from_str::<G2MGameConfig>(&content) {
            Ok(config) => Some(config),
            Err(e) => {
                eprintln!("解析 g2m.json 失败: {}", e);
                None
            }
        },
        Err(e) => {
            eprintln!("读取 g2m.json 失败: {}", e);
            None
        }
    }
}

/// 写入 g2m.json 文件到游戏根目录
/// 只包含 name, exe, img, type, mods（不包含 id, md5, version, time, deleted）
/// 会保留现有的 mods 字段
pub fn write_g2m_json(
    game_dir: &str,
    name: &str,
    exe: &str,
    img: &Option<String>,
    game_type: &Option<String>,
) {
    let game_path = Path::new(game_dir);
    let g2m_json_path = game_path.join("g2m.json");

    // 获取或创建配置（如果不存在会自动扫描 MOD）
    let config = get_or_create_g2m_json(game_dir, name, exe, img, game_type);
    let existing_mods = config.mods;

    // 创建 g2m.json 内容
    let mut g2m_data = serde_json::json!({
        "name": name,
        "exe": exe,
        "mods": existing_mods,
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

/// 从游戏目录自动识别游戏信息（用于创建 g2m.json）
fn auto_detect_game_info(game_dir: &str) -> G2MGameConfig {
    let game_path = Path::new(game_dir);
    let mut config = G2MGameConfig {
        name: String::new(),
        exe: String::new(),
        img: None,
        r#type: None,
        mods: Vec::new(),
    };

    // 尝试查找游戏可执行文件
    let possible_exes = ["gta3.exe", "gta-vc.exe", "gta_sa.exe", "gta-sa.exe"];
    for exe_name in &possible_exes {
        let exe_path = game_path.join(exe_name);
        if exe_path.exists() {
            config.exe = exe_name.to_string();
            config.r#type = detect_game_type_from_exe(exe_name);
            // 根据游戏类型设置默认名称
            config.name = match config.r#type.as_deref() {
                Some("gta3") => "GTA III".to_string(),
                Some("gtavc") => "GTA Vice City".to_string(),
                Some("gtasa") => "GTA San Andreas".to_string(),
                _ => exe_name.replace(".exe", "").to_uppercase(),
            };
            break;
        }
    }

    // 如果没找到，尝试扫描目录中的所有 .exe 文件
    if config.exe.is_empty() {
        if let Ok(entries) = fs::read_dir(game_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext.to_string_lossy().to_lowercase() == "exe" {
                            if let Some(exe_name) = path.file_name().and_then(|n| n.to_str()) {
                                config.exe = exe_name.to_string();
                                config.r#type = detect_game_type_from_exe(exe_name);
                                config.name = exe_name.replace(".exe", "").to_uppercase();
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    config
}

/// 添加 MOD 到 g2m.json 的 mods 列表
/// 如果 g2m.json 不存在，会自动创建并尝试识别游戏信息
pub fn add_mod_to_g2m_json(
    game_dir: &str,
    mod_name: String,
    mod_author: Option<String>,
    mod_source_path: String,
) -> Result<(), String> {
    use crate::game::types::G2MModInfo;
    let game_path = Path::new(game_dir);
    let g2m_json_path = game_path.join("g2m.json");

    // 读取现有的 g2m.json，如果不存在则自动识别游戏信息
    let mut config = read_g2m_json(game_dir).unwrap_or_else(|| auto_detect_game_info(game_dir));

    // 检查是否已存在相同的 MOD（根据 mod_source_path）
    if config
        .mods
        .iter()
        .any(|m| m.mod_source_path == mod_source_path)
    {
        return Err("MOD 已存在于列表中".to_string());
    }

    // 添加新的 MOD
    config.mods.push(G2MModInfo {
        name: mod_name,
        author: mod_author,
        mod_source_path,
    });

    // 保存更新后的配置
    match serde_json::to_string_pretty(&config) {
        Ok(json_content) => {
            fs::write(&g2m_json_path, json_content)
                .map_err(|e| format!("写入 g2m.json 失败: {}", e))?;
            Ok(())
        }
        Err(e) => Err(format!("序列化 g2m.json 失败: {}", e)),
    }
}

/// 从 g2m.json 的 mods 列表中移除 MOD
pub fn remove_mod_from_g2m_json(game_dir: &str, mod_source_path: &str) -> Result<(), String> {
    let game_path = Path::new(game_dir);
    let g2m_json_path = game_path.join("g2m.json");

    // 读取现有的 g2m.json
    let mut config = match read_g2m_json(game_dir) {
        Some(c) => c,
        None => return Err("g2m.json 文件不存在".to_string()),
    };

    // 移除指定的 MOD
    let initial_len = config.mods.len();
    config.mods.retain(|m| m.mod_source_path != mod_source_path);

    if config.mods.len() == initial_len {
        return Err("未找到指定的 MOD".to_string());
    }

    // 保存更新后的配置
    match serde_json::to_string_pretty(&config) {
        Ok(json_content) => {
            fs::write(&g2m_json_path, json_content)
                .map_err(|e| format!("写入 g2m.json 失败: {}", e))?;
            Ok(())
        }
        Err(e) => Err(format!("序列化 g2m.json 失败: {}", e)),
    }
}

/// 扫描游戏目录，自动识别已安装的 MOD
/// 扫描 CLEO 目录和 modloader 目录中的 MOD 文件
pub fn scan_installed_mods(game_dir: &str) -> Vec<G2MModInfo> {
    let game_path = Path::new(game_dir);
    let mut mods = Vec::new();

    // 扫描 CLEO 目录中的 MOD（以 [MOD名称] 开头的文件或文件夹）
    let cleo_dir = game_path.join("CLEO");
    if cleo_dir.exists() && cleo_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&cleo_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = entry.file_name();
                let file_name_str = file_name.to_string_lossy();

                // 检查是否以 [ 开头，表示是 MOD 文件
                if file_name_str.starts_with('[') {
                    // 提取 MOD 名称（去除 [ 和 ]）
                    if let Some(end_bracket) = file_name_str.find(']') {
                        let mod_name = file_name_str[1..end_bracket].to_string();
                        let mod_source_path = format!("CLEO/{}", file_name_str);

                        // 检查是否已存在相同的 MOD
                        if !mods
                            .iter()
                            .any(|m: &G2MModInfo| m.mod_source_path == mod_source_path)
                        {
                            mods.push(G2MModInfo {
                                name: mod_name.clone(),
                                author: None,
                                mod_source_path,
                            });
                        }
                    }
                }
            }
        }
    }

    // 扫描 modloader 目录中的 MOD（以 [MOD名称] 命名的文件夹）
    let modloader_dir = game_path.join("modloader");
    if modloader_dir.exists() && modloader_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&modloader_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = entry.file_name();
                    let dir_name_str = dir_name.to_string_lossy();

                    // 检查是否以 [ 开头，表示是 MOD 文件夹
                    if dir_name_str.starts_with('[') {
                        // 提取 MOD 名称（去除 [ 和 ]）
                        if let Some(end_bracket) = dir_name_str.find(']') {
                            let mod_name = dir_name_str[1..end_bracket].to_string();
                            let mod_source_path = format!("modloader/{}", dir_name_str);

                            // 检查是否已存在相同的 MOD
                            if !mods
                                .iter()
                                .any(|m: &G2MModInfo| m.mod_source_path == mod_source_path)
                            {
                                mods.push(G2MModInfo {
                                    name: mod_name.clone(),
                                    author: None,
                                    mod_source_path,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    mods
}

/// 获取或创建 g2m.json，如果不存在则自动扫描已安装的 MOD
pub fn get_or_create_g2m_json(
    game_dir: &str,
    name: &str,
    exe: &str,
    img: &Option<String>,
    game_type: &Option<String>,
) -> G2MGameConfig {
    // 尝试读取现有的 g2m.json
    if let Some(config) = read_g2m_json(game_dir) {
        return config;
    }

    // 如果不存在，扫描已安装的 MOD
    let scanned_mods = scan_installed_mods(game_dir);

    // 创建新的配置
    G2MGameConfig {
        name: name.to_string(),
        exe: exe.to_string(),
        img: img.clone(),
        r#type: game_type.clone(),
        mods: scanned_mods,
    }
}

/// 获取配置目录路径
pub fn get_config_dir(_app_handle: &AppHandle) -> Result<PathBuf, String> {
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

/// 递归复制目录的辅助函数
pub fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
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

/// 辅助函数：不区分大小写检查目录中的文件
pub fn find_file_case_insensitive(dir: &Path, target_name: &str) -> Option<(PathBuf, String)> {
    if !dir.exists() || !dir.is_dir() {
        return None;
    }

    let target_lower = target_name.to_lowercase();

    // 读取目录
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Some(file_name) = entry.file_name().to_str() {
                        if file_name.to_lowercase() == target_lower {
                            return Some((entry.path(), file_name.to_string()));
                        }
                    }
                }
            }
        }
    }

    None
}
