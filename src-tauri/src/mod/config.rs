use crate::game::types::{ApiResponse, G2MModConfig};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

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

/// 选择 MOD 目录
#[tauri::command]
pub async fn select_mod_directory(
    app_handle: AppHandle,
) -> Result<ApiResponse<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = mpsc::channel();
    
    app_handle
        .dialog()
        .file()
        .set_title("选择 MOD 根目录")
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

/// 选择 MOD 文件或文件夹
#[tauri::command]
pub async fn select_mod_files(
    app_handle: AppHandle,
    default_dir: Option<String>,
    is_directory: bool,
) -> Result<ApiResponse<Vec<String>>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    let mut dialog = app_handle
        .dialog()
        .file()
        .set_title(if is_directory { "选择文件夹" } else { "选择文件" });

    // 如果提供了默认目录，设置为起始目录
    if let Some(dir) = default_dir {
        if let Ok(path) = PathBuf::from(&dir).canonicalize() {
            dialog = dialog.set_directory(path);
        }
    }

    if is_directory {
        dialog.pick_folder(move |path| {
            let _ = tx.send(path.map(|p| vec![p.to_string()]));
        });
    } else {
        dialog.pick_files(move |paths| {
            let _ = tx.send(paths.map(|ps| ps.iter().map(|p| p.to_string()).collect()));
        });
    }

    match rx.recv() {
        Ok(Some(paths)) => Ok(ApiResponse::success(paths)),
        Ok(None) => Ok(ApiResponse::error(String::new())), // 用户取消，不返回错误信息
        Err(_) => Ok(ApiResponse::error("文件选择失败".to_string())),
    }
}

/// 读取 g2m_mod.json 配置文件（Tauri 命令）
#[tauri::command]
pub async fn read_g2m_mod_config(
    mod_dir: String,
) -> Result<ApiResponse<Option<G2MModConfig>>, String> {
    let mod_path = Path::new(&mod_dir);
    
    if !mod_path.exists() {
        return Ok(ApiResponse::error("MOD 目录不存在".to_string()));
    }

    let config = load_g2m_mod_config(mod_path);
    Ok(ApiResponse::success(config))
}

/// 文件树节点
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,              // 相对于 MOD 根目录的路径
    pub is_directory: bool,
    pub children: Option<Vec<FileTreeNode>>,
}

/// 获取目录文件树
#[tauri::command]
pub async fn get_mod_file_tree(
    mod_dir: String,
) -> Result<ApiResponse<Vec<FileTreeNode>>, String> {
    let mod_path = Path::new(&mod_dir);
    
    if !mod_path.exists() {
        return Ok(ApiResponse::error("MOD 目录不存在".to_string()));
    }

    if !mod_path.is_dir() {
        return Ok(ApiResponse::error("路径不是目录".to_string()));
    }

    let mut tree = Vec::new();
    
    match build_file_tree(mod_path, mod_path, &mut tree) {
        Ok(_) => Ok(ApiResponse::success(tree)),
        Err(e) => Ok(ApiResponse::error(format!("读取文件树失败: {}", e))),
    }
}

/// 递归构建文件树
fn build_file_tree(
    root: &Path,
    current: &Path,
    result: &mut Vec<FileTreeNode>,
) -> std::io::Result<()> {
    if !current.is_dir() {
        return Ok(());
    }

    let entries = fs::read_dir(current)?;
    
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        
        // 跳过隐藏文件和系统文件
        if name.starts_with('.') {
            continue;
        }

        // 计算相对于根目录的路径
        let relative_path = path.strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            let mut node = FileTreeNode {
                name: name.clone(),
                path: relative_path.clone(),
                is_directory: true,
                children: Some(Vec::new()),
            };

            // 递归处理子目录
            if let Some(children) = &mut node.children {
                build_file_tree(root, &path, children)?;
            }

            result.push(node);
        } else {
            result.push(FileTreeNode {
                name,
                path: relative_path,
                is_directory: false,
                children: None,
            });
        }
    }

    // 排序：目录在前，文件在后，然后按名称排序
    result.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(())
}

/// 保存 g2m_mod.json 配置文件
#[tauri::command]
pub async fn save_g2m_mod_config(
    mod_dir: String,
    config: G2MModConfig,
) -> Result<ApiResponse<()>, String> {
    let mod_path = Path::new(&mod_dir);
    
    if !mod_path.exists() {
        return Ok(ApiResponse::error("MOD 目录不存在".to_string()));
    }

    let config_path = mod_path.join("g2m_mod.json");

    // 序列化配置为 JSON
    match serde_json::to_string_pretty(&config) {
        Ok(json_content) => {
            match fs::write(&config_path, json_content) {
                Ok(_) => Ok(ApiResponse::success(())),
                Err(e) => Ok(ApiResponse::error(format!("写入 g2m_mod.json 失败: {}", e))),
            }
        }
        Err(e) => Ok(ApiResponse::error(format!("序列化配置失败: {}", e))),
    }
}

