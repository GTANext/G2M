use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::{AppHandle, Manager};

use crate::{
    ensure_game_workspace_package_path, initialize_database, migrate_legacy_settings_to_database,
    GameDirectory, GAME_WORKSPACE_DIR_NAME, GAME_WORKSPACE_PACKAGE_FILE_NAME,
};

pub(crate) struct StoragePaths {
    pub(crate) assets_dir: PathBuf,
    pub(crate) resource_dir: PathBuf,
    pub(crate) database_path: PathBuf,
}

pub(crate) fn ensure_storage(app: &AppHandle) -> Result<StoragePaths, String> {
    let executable_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve executable path: {error}"))?;
    let app_dir = executable_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve application directory".to_string())?;
    let assets_dir = app_dir.join("assets");
    let config_dir = assets_dir.join("config");
    let legacy_config_dir = app_dir.join("config");

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("failed to create config directory: {error}"))?;
    migrate_legacy_database(&legacy_config_dir, &config_dir)?;

    let database_path = config_dir.join("database.db");
    initialize_database(&database_path)?;
    migrate_legacy_settings_to_database(&database_path, &config_dir.join("settings.json"))?;
    migrate_legacy_settings_to_database(&database_path, &legacy_config_dir.join("settings.json"))?;
    migrate_legacy_settings_to_database(&database_path, &app_dir.join("settings.json"))?;

    Ok(StoragePaths {
        assets_dir,
        resource_dir: app
            .path()
            .resource_dir()
            .map_err(|error| format!("failed to resolve resource directory: {error}"))?,
        database_path,
    })
}

fn migrate_legacy_database(legacy_config_dir: &Path, config_dir: &Path) -> Result<(), String> {
    let legacy_database_path = legacy_config_dir.join("database.db");
    let database_path = config_dir.join("database.db");
    if database_path.exists() || !legacy_database_path.exists() {
        return Ok(());
    }

    for suffix in ["", "-shm", "-wal"] {
        move_file_if_exists(
            &append_path_suffix(&legacy_database_path, suffix),
            &append_path_suffix(&database_path, suffix),
        )?;
    }

    Ok(())
}

fn append_path_suffix(path: &Path, suffix: &str) -> PathBuf {
    PathBuf::from(format!("{}{}", path.to_string_lossy(), suffix))
}

fn move_file_if_exists(source_path: &Path, target_path: &Path) -> Result<(), String> {
    if !source_path.exists() || target_path.exists() {
        return Ok(());
    }

    if let Some(parent_dir) = target_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to create migrated database directory: {error}"))?;
    }

    match fs::rename(source_path, target_path) {
        Ok(()) => Ok(()),
        Err(_) => {
            fs::copy(source_path, target_path).map_err(|error| {
                format!(
                    "failed to migrate legacy database file {} -> {}: {error}",
                    source_path.display(),
                    target_path.display()
                )
            })?;
            fs::remove_file(source_path).map_err(|error| {
                format!(
                    "failed to remove legacy database file after copy {}: {error}",
                    source_path.display()
                )
            })
        }
    }
}

pub(crate) fn ensure_game_workspaces(games: &[GameDirectory]) -> Result<(), String> {
    for game in games {
        if game.path.trim().is_empty() {
            continue;
        }

        let game_path = Path::new(&game.path);
        if game_path.exists() && game_path.is_dir() {
            ensure_game_workspace(game_path)?;
        }
    }

    Ok(())
}

pub(crate) fn ensure_game_workspace(game_path: &Path) -> Result<(), String> {
    let workspace_dir = game_path.join(GAME_WORKSPACE_DIR_NAME);
    let mods_dir = workspace_dir.join("mods");

    fs::create_dir_all(&mods_dir).map_err(|error| {
        format!(
            "failed to create game workspace under {}: {error}",
            workspace_dir.to_string_lossy()
        )
    })?;
    ensure_game_workspace_package_path(&workspace_dir)?;

    Ok(())
}

pub(crate) fn game_workspace_package_path(game_path: &Path) -> PathBuf {
    game_path
        .join(GAME_WORKSPACE_DIR_NAME)
        .join(GAME_WORKSPACE_PACKAGE_FILE_NAME)
}
