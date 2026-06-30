use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::AppHandle;

use crate::{
    ensure_game_workspace_package_path, initialize_database, migrate_legacy_settings_to_database,
    GameDirectory, GAME_WORKSPACE_DIR_NAME, GAME_WORKSPACE_PACKAGE_FILE_NAME,
};

pub(crate) struct StoragePaths {
    pub(crate) app_dir: PathBuf,
    pub(crate) database_path: PathBuf,
}

pub(crate) fn ensure_storage(app: &AppHandle) -> Result<StoragePaths, String> {
    let _ = app;
    let executable_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve executable path: {error}"))?;
    let app_dir = executable_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve application directory".to_string())?;
    let config_dir = app_dir.join("config");

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("failed to create config directory: {error}"))?;

    let database_path = config_dir.join("database.db");
    initialize_database(&database_path)?;
    migrate_legacy_settings_to_database(&database_path, &config_dir.join("settings.json"))?;
    migrate_legacy_settings_to_database(&database_path, &app_dir.join("settings.json"))?;

    Ok(StoragePaths {
        app_dir,
        database_path,
    })
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
