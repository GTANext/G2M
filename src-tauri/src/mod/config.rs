use crate::game::types::G2MModConfig;
use std::fs;
use std::path::Path;

/// 读取 g2m_mod.json 配置文件
pub fn load_g2m_mod_config(mod_source_path: &Path) -> Option<G2MModConfig> {
    let config_path = mod_source_path.join("g2m_mod.json");

    // 如果 mod_source_path 是文件，则检查其所在目录
    let config_path = if mod_source_path.is_file() {
        mod_source_path
            .parent()
            .and_then(|p| Some(p.join("g2m_mod.json")))
            .unwrap_or(config_path)
    } else {
        config_path
    };

    if !config_path.exists() {
        return None;
    }

    match fs::read_to_string(&config_path) {
        Ok(content) => match serde_json::from_str::<G2MModConfig>(&content) {
            Ok(config) => Some(config),
            Err(e) => {
                eprintln!("解析 g2m_mod.json 失败: {}", e);
                None
            }
        },
        Err(e) => {
            eprintln!("读取 g2m_mod.json 失败: {}", e);
            None
        }
    }
}

