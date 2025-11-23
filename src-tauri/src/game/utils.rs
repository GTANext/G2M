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

/// 写入 g2m.json 文件到游戏根目录
/// 只包含 name, exe, img, type（不包含 id, md5, version, time, deleted）
pub fn write_g2m_json(
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

