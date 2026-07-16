use std::path::Path;

use crate::{
    models::{ModInstallPlan, StoredGameEntry},
    repository::{load_mod_install_plan, load_stored_game_by_id},
    symlink_install::{create_mod_symlinks, remove_mod_symlinks},
};

pub(crate) fn normalize_optional_string(value: Option<String>) -> String {
    value
        .map(|current| current.trim().to_string())
        .filter(|current| !current.is_empty())
        .unwrap_or_default()
}

pub(crate) fn load_required_game(
    database_path: &Path,
    game_id: &str,
    not_found_message: &str,
) -> Result<StoredGameEntry, String> {
    load_stored_game_by_id(database_path, game_id)?
        .ok_or_else(|| not_found_message.to_string())
}

pub(crate) fn load_required_mod_install_plan(
    database_path: &Path,
    mod_id: &str,
    not_found_message: &str,
) -> Result<ModInstallPlan, String> {
    load_mod_install_plan(database_path, mod_id)?
        .ok_or_else(|| not_found_message.to_string())
}

pub(crate) fn resolve_game_image(
    cover_image_source_path: Option<&str>,
    existing_cover_base64: Option<String>,
) -> Result<String, String> {
    if let Some(source_path) = cover_image_source_path {
        return crate::game_support::read_image_as_base64(source_path);
    }

    Ok(existing_cover_base64.unwrap_or_default())
}

pub(crate) fn resolve_updated_game_image(
    existing_game: &StoredGameEntry,
    cover_image_source_path: Option<&str>,
    existing_cover_base64: Option<String>,
    use_default_image: bool,
) -> Result<String, String> {
    if let Some(source_path) = cover_image_source_path {
        return crate::game_support::read_image_as_base64(source_path);
    }

    if use_default_image {
        return Ok(String::new());
    }

    if let Some(existing_b64) = existing_cover_base64 {
        return Ok(existing_b64);
    }

    Ok(existing_game.image_path.clone())
}

pub(crate) fn resolve_import_display_name(
    mod_name: Option<&str>,
    fallback_name: &str,
) -> Result<String, String> {
    let resolved_name = mod_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback_name)
        .trim()
        .to_string();

    if resolved_name.is_empty() {
        return Err("无法识别 Mod 文件夹名称".to_string());
    }

    Ok(resolved_name)
}

pub(crate) fn set_mod_symlinks_enabled(
    install_plan: &ModInstallPlan,
    enabled: bool,
    overwrite_targets: &[String],
) -> Result<(), String> {
    if enabled {
        return create_mod_symlinks(
            Path::new(&install_plan.game_path),
            &install_plan.mod_id,
            Path::new(&install_plan.source_dir),
            &install_plan.files,
            overwrite_targets,
        );
    }

    remove_mod_symlinks(
        Path::new(&install_plan.game_path),
        &install_plan.mod_id,
        Path::new(&install_plan.source_dir),
        &install_plan.files,
    )
}
