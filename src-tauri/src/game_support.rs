use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::{random_suffix, StoredGameEntry};

pub(crate) fn detect_game_installation(
    game_path: &Path,
    games: &[StoredGameEntry],
) -> Result<StoredGameEntry, String> {
    if !game_path.exists() {
        return Err("游戏目录不存在".to_string());
    }

    if !game_path.is_dir() {
        return Err("提供的路径不是目录".to_string());
    }

    let detected = fs::read_dir(game_path)
        .map_err(|error| format!("failed to scan game directory: {error}"))?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.file_name().into_string().ok())
        .map(|file_name| file_name.to_lowercase())
        .find_map(|file_name| {
            let game_type = if matches!(file_name.as_str(), "gta_sa.exe" | "gta-sa.exe") {
                Some("sa")
            } else if matches!(file_name.as_str(), "gta-vc.exe" | "gta_vc.exe") {
                Some("vc")
            } else if file_name == "gta3.exe" {
                Some("iii")
            } else {
                None
            }?;

            Some((game_type.to_string(), file_name))
        });

    let (game_type, exe_name) =
        detected.ok_or_else(|| "未识别到 GTA III / VC / SA 的可执行文件".to_string())?;

    Ok(StoredGameEntry {
        id: build_game_id(&game_type),
        game_type: game_type.clone(),
        name: default_game_name(&game_type, games),
        path: game_path.to_string_lossy().to_string(),
        exe_name,
        version: String::new(),
        image_path: String::new(),
        created_at: 0,
        updated_at: 0,
    })
}

pub(crate) fn default_game_name(game_type: &str, games: &[StoredGameEntry]) -> String {
    let same_type_count = games
        .iter()
        .filter(|game| game.game_type == game_type)
        .count();

    if same_type_count == 0 {
        canonical_game_name(game_type).to_string()
    } else {
        format!("{} #{}", canonical_game_name(game_type), same_type_count + 1)
    }
}

pub(crate) fn canonical_game_name(id: &str) -> &'static str {
    match id {
        "sa" => "圣安地列斯",
        "vc" => "罪恶都市",
        "iii" => "GTA3",
        _ => "Unknown Game",
    }
}

pub(crate) fn normalize_game_type(game_type: &str) -> Result<&'static str, String> {
    match game_type.trim().to_lowercase().as_str() {
        "sa" => Ok("sa"),
        "vc" => Ok("vc"),
        "iii" => Ok("iii"),
        _ => Err("不支持的游戏类型".to_string()),
    }
}

pub(crate) fn canonical_exe_name(id: &str) -> &'static str {
    match id {
        "sa" => "gta_sa.exe",
        "vc" => "gta-vc.exe",
        "iii" => "gta3.exe",
        _ => "unknown.exe",
    }
}

pub(crate) fn store_game_cover_image(
    custom_assets_dir: &Path,
    game_type: &str,
    source_path: Option<&str>,
) -> Result<String, String> {
    let normalized_source = source_path.map(str::trim).filter(|value| !value.is_empty());

    let Some(source_path) = normalized_source else {
        return Ok(String::new());
    };

    let source = Path::new(source_path);
    if !source.exists() || !source.is_file() {
        return Err("选择的游戏封面文件不存在".to_string());
    }

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "jpg".to_string());
    let file_name = format!("{game_type}-{}.{}", random_suffix(), extension);
    let target_path = custom_assets_dir.join(file_name);

    fs::copy(source, &target_path)
        .map_err(|error| format!("failed to copy game cover image: {error}"))?;

    Ok(target_path.to_string_lossy().to_string())
}

pub(crate) fn cleanup_custom_game_cover(custom_assets_dir: &Path, image_path: &str) -> Result<(), String> {
    let normalized_path = image_path.trim();
    if normalized_path.is_empty() {
        return Ok(());
    }

    let image = Path::new(normalized_path);
    if !image.exists() {
        return Ok(());
    }

    if !image.starts_with(custom_assets_dir) {
        return Ok(());
    }

    fs::remove_file(image).map_err(|error| format!("failed to remove old game cover image: {error}"))?;
    Ok(())
}

fn build_game_id(game_type: &str) -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    format!("{game_type}-{timestamp}")
}
