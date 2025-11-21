use crate::game::types::ApiResponse;
use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{self, Write, BufReader, BufWriter};
use std::path::{Path, PathBuf};
use tauri::{Window, AppHandle, Emitter};
use zip::ZipArchive;
use futures_util::StreamExt;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadGameRequest {
    pub game_type: String, // gta3, gtavc, gtasa
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractGameRequest {
    pub zip_path: String,
    pub extract_to: String,
    pub game_name: String,
    pub game_dir: String,
    pub game_exe: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadRecord {
    pub game_type: String,
    pub zip_path: String,
    pub download_date: String,
    pub file_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractRecord {
    pub game_type: String,
    pub zip_path: String,
    pub extract_path: String,
    pub extract_date: String,
    pub game_name: String,
    pub game_dir: String,
    pub game_exe: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DownloadLog {
    downloads: Vec<DownloadRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExtractLog {
    extracts: Vec<ExtractRecord>,
}

// 获取 G2M/Download 目录路径
fn get_download_dir(_app_handle: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("无法获取当前目录: {}", e))?;
        let project_root = if current_dir.file_name()
            .and_then(|name| name.to_str())
            .map(|name| name == "src-tauri")
            .unwrap_or(false) {
            current_dir.parent()
                .ok_or("无法获取项目根目录")?
                .to_path_buf()
        } else {
            current_dir
        };
        Ok(project_root.join("src-tauri").join("G2M").join("Download"))
    } else {
        let exe_dir = std::env::current_exe()
            .map_err(|e| format!("获取程序路径失败: {}", e))?
            .parent()
            .ok_or("无法获取程序目录")?
            .to_path_buf();
        Ok(exe_dir.join("G2M").join("Download"))
    }
}

// 获取下载日志文件路径 - 保存到 G2M/Config/ 目录
fn get_download_log_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    use crate::game::core::get_config_dir;
    let config_dir = get_config_dir(app_handle)?;
    Ok(config_dir.join("GameDownload.json"))
}

// 获取解压日志文件路径 - 保存到 G2M/Config/ 目录
fn get_extract_log_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    use crate::game::core::get_config_dir;
    let config_dir = get_config_dir(app_handle)?;
    Ok(config_dir.join("GameExtract.json"))
}

// 读取下载日志
fn read_download_log(app_handle: &AppHandle) -> Result<DownloadLog, String> {
    let log_path = get_download_log_path(app_handle)?;
    
    if !log_path.exists() {
        return Ok(DownloadLog { downloads: Vec::new() });
    }
    
    let file = File::open(&log_path)
        .map_err(|e| format!("读取下载日志失败: {}", e))?;
    let reader = BufReader::new(file);
    let log: DownloadLog = serde_json::from_reader(reader)
        .map_err(|e| format!("解析下载日志失败: {}", e))?;
    Ok(log)
}

// 写入下载日志
fn write_download_log(app_handle: &AppHandle, log: &DownloadLog) -> Result<(), String> {
    let log_path = get_download_log_path(app_handle)?;
    
    // 确保目录存在
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| format!("打开下载日志失败: {}", e))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, log)
        .map_err(|e| format!("写入下载日志失败: {}", e))?;
    Ok(())
}

// 读取解压日志
fn read_extract_log(app_handle: &AppHandle) -> Result<ExtractLog, String> {
    let log_path = get_extract_log_path(app_handle)?;
    
    if !log_path.exists() {
        return Ok(ExtractLog { extracts: Vec::new() });
    }
    
    let file = File::open(&log_path)
        .map_err(|e| format!("读取解压日志失败: {}", e))?;
    let reader = BufReader::new(file);
    let log: ExtractLog = serde_json::from_reader(reader)
        .map_err(|e| format!("解析解压日志失败: {}", e))?;
    Ok(log)
}

// 写入解压日志
fn write_extract_log(app_handle: &AppHandle, log: &ExtractLog) -> Result<(), String> {
    let log_path = get_extract_log_path(app_handle)?;
    
    // 确保目录存在
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| format!("打开解压日志失败: {}", e))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, log)
        .map_err(|e| format!("写入解压日志失败: {}", e))?;
    Ok(())
}

// 游戏文件名映射
fn get_game_filename(game_type: &str) -> Option<&str> {
    match game_type {
        "gta3" => Some("Grand%20Theft%20Auto%20III.zip"),
        "gtavc" => Some("Grand%20Theft%20Auto%20Vice%20City.zip"),
        "gtasa" => Some("Grand%20Theft%20Auto%20San%20Andreas.zip"),
        _ => None,
    }
}

// 下载游戏命令
#[tauri::command]
pub async fn download_game(
    window: Window,
    app_handle: AppHandle,
    request: DownloadGameRequest,
) -> Result<ApiResponse<String>, String> {
    let game_type = request.game_type;

    // 获取游戏文件名
    let filename = match get_game_filename(&game_type) {
        Some(name) => name,
        None => {
            return Ok(ApiResponse::error(format!(
                "不支持的游戏类型: {}",
                game_type
            )));
        }
    };

    // 获取下载目录
    let download_dir = get_download_dir(&app_handle)?;
    std::fs::create_dir_all(&download_dir)
        .map_err(|e| format!("创建下载目录失败: {}", e))?;

    // 构建保存路径
    let zip_filename = filename.replace("%20", " ");
    let save_path = download_dir.join(&zip_filename);

    // 构建下载 URL
    let base_url = "https://gtamodx-manager-r2.miomoe.cn/game/";
    let download_url = format!("{}{}", base_url, filename);

    // 下载文件
    let zip_path = match download_file(&window, &download_url, &save_path).await {
        Ok(path) => path,
        Err(e) => {
            return Ok(ApiResponse::error(format!("下载失败: {}", e)));
        }
    };

    // 获取文件大小
    let file_size = std::fs::metadata(&zip_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 记录下载信息到 JSON
    let mut log = read_download_log(&app_handle)?;
    
    // 检查是否已存在相同游戏类型的下载记录
    if let Some(existing) = log.downloads.iter_mut().find(|r| r.game_type == game_type) {
        // 更新现有记录
        existing.zip_path = zip_path.to_string_lossy().to_string();
        existing.download_date = Utc::now().to_rfc3339();
        existing.file_size = file_size;
    } else {
        // 添加新记录
        log.downloads.push(DownloadRecord {
            game_type: game_type.clone(),
            zip_path: zip_path.to_string_lossy().to_string(),
            download_date: Utc::now().to_rfc3339(),
            file_size,
        });
    }
    
    write_download_log(&app_handle, &log)?;

    Ok(ApiResponse::success(zip_path.to_string_lossy().to_string()))
}

// 解压游戏命令
#[tauri::command]
pub async fn extract_game(
    app_handle: AppHandle,
    request: ExtractGameRequest,
) -> Result<ApiResponse<String>, String> {
    let zip_path = Path::new(&request.zip_path);
    let extract_to = Path::new(&request.extract_to);

    // 验证 ZIP 文件是否存在
    if !zip_path.exists() {
        return Ok(ApiResponse::error("ZIP 文件不存在".to_string()));
    }

    // 创建解压目录
    std::fs::create_dir_all(extract_to)
        .map_err(|e| format!("创建解压目录失败: {}", e))?;

    // 解压文件
    match extract_zip(zip_path, extract_to).await {
        Ok(_) => {
            // 从下载记录中获取 game_type
            let download_log = read_download_log(&app_handle)?;
            let game_type = download_log.downloads
                .iter()
                .find(|r| r.zip_path == request.zip_path)
                .map(|r| r.game_type.clone())
                .unwrap_or_else(|| {
                    // 如果找不到，从文件名推断
                    request.zip_path.split('/').last()
                        .and_then(|name| {
                            if name.contains("III") { Some("gta3".to_string()) }
                            else if name.contains("Vice City") { Some("gtavc".to_string()) }
                            else if name.contains("San Andreas") { Some("gtasa".to_string()) }
                            else { None }
                        })
                        .unwrap_or_else(|| "unknown".to_string())
                });
            
            // 记录解压信息到解压日志（支持多次解压）
            let mut extract_log = read_extract_log(&app_handle)?;
            extract_log.extracts.push(ExtractRecord {
                game_type,
                zip_path: request.zip_path.clone(),
                extract_path: request.extract_to.clone(),
                extract_date: Utc::now().to_rfc3339(),
                game_name: request.game_name.clone(),
                game_dir: request.game_dir.clone(),
                game_exe: request.game_exe.clone(),
            });
            write_extract_log(&app_handle, &extract_log)?;

            Ok(ApiResponse::success(extract_to.to_string_lossy().to_string()))
        }
        Err(e) => {
            Ok(ApiResponse::error(format!("解压失败: {}", e)))
        }
    }
}

// 获取下载记录
#[tauri::command]
pub async fn get_download_records(
    app_handle: AppHandle,
) -> Result<ApiResponse<Vec<DownloadRecord>>, String> {
    let log = read_download_log(&app_handle)?;
    Ok(ApiResponse::success(log.downloads))
}

// 获取解压记录
#[tauri::command]
pub async fn get_extract_records(
    app_handle: AppHandle,
) -> Result<ApiResponse<Vec<ExtractRecord>>, String> {
    let log = read_extract_log(&app_handle)?;
    Ok(ApiResponse::success(log.extracts))
}

// 下载文件并显示进度
async fn download_file(
    window: &Window,
    url: &str,
    save_path: &Path,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 创建 HTTP 客户端
    let client = reqwest::Client::new();
    let response = client.get(url).send().await?;

    // 获取文件总大小
    let total_size = response.content_length();

    // 创建文件
    let mut file = File::create(save_path)?;
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    // 使用 tokio 的异步流处理
    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;

        // 发送进度更新
        let percentage = if let Some(total) = total_size {
            (downloaded as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        let progress = DownloadProgress {
            downloaded,
            total: total_size,
            percentage,
        };

        // 发送进度事件到前端
        let _ = window.emit("download-progress", &progress);
    }

    file.sync_all()?;
    Ok(save_path.to_path_buf())
}

// 解压 ZIP 文件
async fn extract_zip(zip_path: &Path, extract_to: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // 使用 tokio 的异步运行时执行同步操作
    let zip_path = zip_path.to_path_buf();
    let extract_to = extract_to.to_path_buf();
    
    let result = tokio::task::spawn_blocking(move || -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let file = File::open(&zip_path)?;
        let mut archive = ZipArchive::new(file)?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = match file.enclosed_name() {
                Some(path) => extract_to.join(path),
                None => continue,
            };

            // 创建目录
            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = File::create(&outpath)?;
                io::copy(&mut file, &mut outfile)?;
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("任务执行失败: {}", e))) as Box<dyn std::error::Error>)?;

    result.map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, format!("解压失败: {}", e))) as Box<dyn std::error::Error>)
}

// 选择解压目录
#[tauri::command]
pub async fn select_extract_folder() -> Result<ApiResponse<String>, String> {
    use rfd::AsyncFileDialog;

    let folder = AsyncFileDialog::new()
        .set_title("选择游戏解压位置")
        .pick_folder()
        .await;

    match folder {
        Some(folder) => {
            let path = folder.path().to_string_lossy().to_string();
            Ok(ApiResponse::success(path))
        }
        None => Ok(ApiResponse::error("未选择文件夹".to_string())),
    }
}

