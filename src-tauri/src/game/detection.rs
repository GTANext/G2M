use crate::game::{ApiResponse, GameDetectionResult};
use crate::game::utils::{calculate_file_md5, detect_game_type_from_exe, get_game_version_from_md5};
use std::path::Path;

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

