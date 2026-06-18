use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;

mod mod_import;

use mod_import::{
    build_mod_import_preview, build_mod_source_preview, copy_directory_recursive,
    import_mod_into_database, prepare_import_source, resolve_import_source, unique_directory_path,
    ImportFileOverride, ImportedModFile,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapPayload {
    data_dir: String,
    database_path: String,
    games: Vec<GameDirectory>,
    mods: Vec<StoredMod>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameDirectory {
    id: String,
    game_type: String,
    name: String,
    path: String,
    exe_name: String,
    version: String,
    image_path: String,
    created_at: i64,
    updated_at: i64,
    configured: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DetectedGamePayload {
    game_type: String,
    name: String,
    path: String,
    exe_name: String,
    version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredMod {
    id: String,
    game_id: String,
    name: String,
    mod_type: String,
    author: String,
    enabled: bool,
    file_count: i64,
    conflicts: i64,
    size_bytes: i64,
    installed_at: i64,
    description: String,
    source_dir: String,
    target_folders: Vec<String>,
    preview_files: Vec<String>,
    conflict_files: Vec<StoredConflictFile>,
    conflict_with: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredConflictFile {
    id: String,
    file_name: String,
    target_path: String,
    source_path: String,
    target_folder: String,
    other_mod_name: String,
    other_source_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModImportFileEntryPayload {
    relative_path: String,
    target_path: String,
    target_folder: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModImportFileEntryInput {
    relative_path: String,
    target_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModImportPreviewPayload {
    name: String,
    mod_type: String,
    file_count: i64,
    size_bytes: i64,
    source_dir: String,
    has_g2m_manifest: bool,
    g2m_manifest_path: Option<String>,
    target_folders: Vec<String>,
    preview_files: Vec<String>,
    files: Vec<ModImportFileEntryPayload>,
    conflict_files: Vec<StoredConflictFile>,
    conflict_with: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StoredGameEntry {
    id: String,
    game_type: String,
    name: String,
    path: String,
    exe_name: String,
    version: String,
    image_path: String,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyStoredGamePath {
    id: String,
    path: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySettingsFile {
    games: Vec<LegacyStoredGamePath>,
}

struct StoragePaths {
    app_dir: PathBuf,
    database_path: PathBuf,
    custom_assets_dir: PathBuf,
}

#[tauri::command]
fn bootstrap_app(app: AppHandle) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let games = load_game_directories(&paths.database_path)?;
    ensure_game_workspaces(&games)?;

    Ok(BootstrapPayload {
        data_dir: paths.app_dir.to_string_lossy().to_string(),
        database_path: paths.database_path.to_string_lossy().to_string(),
        games,
        mods: load_mods(&paths.database_path)?,
    })
}

#[allow(non_snake_case)]
#[tauri::command]
fn detect_game_directory(app: AppHandle, gamePath: String) -> Result<DetectedGamePayload, String> {
    let paths = ensure_storage(&app)?;
    let existing_games = load_stored_games(&paths.database_path)?;
    let normalized_path = gamePath.trim();

    if normalized_path.is_empty() {
        return Err("game path is empty".to_string());
    }

    let detected_game = detect_game_installation(Path::new(normalized_path), &existing_games)?;

    Ok(DetectedGamePayload {
        game_type: detected_game.game_type,
        name: detected_game.name,
        path: detected_game.path,
        exe_name: detected_game.exe_name,
        version: detected_game.version,
    })
}

#[allow(non_snake_case)]
#[tauri::command]
fn save_game_path(
    app: AppHandle,
    gamePath: String,
    gameType: String,
    name: String,
    version: Option<String>,
    coverImageSourcePath: Option<String>,
) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let existing_games = load_stored_games(&paths.database_path)?;
    let normalized_path = gamePath.trim();

    if normalized_path.is_empty() {
        return Err("game path is empty".to_string());
    }

    let mut detected_game = detect_game_installation(Path::new(normalized_path), &existing_games)?;

    if existing_games
        .iter()
        .any(|game| paths_equal(Path::new(&game.path), Path::new(normalized_path)))
    {
        return Err("该游戏目录已经添加过了".to_string());
    }

    let normalized_game_type = normalize_game_type(&gameType)?;
    let normalized_name = name.trim();

    detected_game.game_type = normalized_game_type.to_string();
    detected_game.name = if normalized_name.is_empty() {
        default_game_name(normalized_game_type, &existing_games)
    } else {
        normalized_name.to_string()
    };
    detected_game.version = version
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default();
    detected_game.image_path = store_game_cover_image(
        &paths.custom_assets_dir,
        &detected_game.game_type,
        coverImageSourcePath.as_deref(),
    )?;
    detected_game.created_at = current_timestamp();
    detected_game.updated_at = detected_game.created_at;

    if let Err(error) = insert_game_entry(&paths.database_path, &detected_game) {
        cleanup_custom_game_cover(&paths.custom_assets_dir, &detected_game.image_path)?;
        return Err(error);
    }
    ensure_game_workspace(Path::new(normalized_path))?;

    bootstrap_app(app)
}

#[allow(non_snake_case)]
#[tauri::command]
fn update_game_entry(
    app: AppHandle,
    gameId: String,
    gameType: String,
    name: String,
    version: Option<String>,
    coverImageSourcePath: Option<String>,
    useDefaultImage: bool,
) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let normalized_game_type = normalize_game_type(&gameType)?;
    let normalized_name = name.trim();
    let existing_game = load_stored_game_by_id(&paths.database_path, &gameId)?
        .ok_or_else(|| "未找到要编辑的游戏".to_string())?;
    let next_image_path = if let Some(source_path) = coverImageSourcePath.as_deref() {
        store_game_cover_image(&paths.custom_assets_dir, normalized_game_type, Some(source_path))?
    } else if useDefaultImage {
        String::new()
    } else {
        existing_game.image_path.clone()
    };

    if next_image_path != existing_game.image_path {
        cleanup_custom_game_cover(&paths.custom_assets_dir, &existing_game.image_path)?;
    }

    let updated_rows = match update_game_entry_in_database(
        &paths.database_path,
        &gameId,
        normalized_game_type,
        if normalized_name.is_empty() {
            canonical_game_name(normalized_game_type)
        } else {
            normalized_name
        },
        version
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
        .as_str(),
        &next_image_path,
        current_timestamp(),
    ) {
        Ok(updated_rows) => updated_rows,
        Err(error) => {
            if next_image_path != existing_game.image_path {
                cleanup_custom_game_cover(&paths.custom_assets_dir, &next_image_path)?;
            }

            return Err(error);
        }
    };

    if updated_rows == 0 {
        return Err("未找到要编辑的游戏".to_string());
    }

    bootstrap_app(app)
}

#[allow(non_snake_case)]
#[tauri::command]
fn delete_game_entry(app: AppHandle, gameId: String) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let existing_game = load_stored_game_by_id(&paths.database_path, &gameId)?;
    delete_mods_for_game(&paths.database_path, &gameId)?;
    let deleted_rows = delete_game_entry_from_database(&paths.database_path, &gameId)?;

    if deleted_rows == 0 {
        return Err("未找到要删除的游戏".to_string());
    }

    if let Some(game) = existing_game {
        cleanup_custom_game_cover(&paths.custom_assets_dir, &game.image_path)?;
    }

    bootstrap_app(app)
}

#[allow(non_snake_case)]
#[tauri::command]
fn update_mod_enabled(
    app: AppHandle,
    modId: String,
    enabled: bool,
) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let updated_rows = update_mod_enabled_in_database(&paths.database_path, &modId, enabled)?;

    if updated_rows == 0 {
        return Err("未找到要更新的 Mod".to_string());
    }

    bootstrap_app(app)
}

#[allow(non_snake_case)]
#[tauri::command]
fn preview_mod_directory(
    app: AppHandle,
    gameId: String,
    modPath: String,
    modName: Option<String>,
) -> Result<ModImportPreviewPayload, String> {
    let paths = ensure_storage(&app)?;
    let (_, source) = resolve_import_source(&paths.database_path, &gameId, &modPath)?;
    let mod_name_override = modName
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(source.display_name.as_str());

    build_mod_import_preview(
        &paths.database_path,
        &gameId,
        &source.source_dir,
        Some(mod_name_override),
    )
}

#[allow(non_snake_case)]
#[tauri::command]
fn inspect_mod_source(
    modPath: String,
    modName: Option<String>,
) -> Result<ModImportPreviewPayload, String> {
    let source = prepare_import_source(&modPath)?;
    let mod_name_override = modName
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(source.display_name.as_str());

    build_mod_source_preview(&source.source_dir, Some(mod_name_override))
}

#[allow(non_snake_case)]
#[tauri::command]
fn import_mod_directory(
    app: AppHandle,
    gameId: String,
    modPath: String,
    modName: Option<String>,
    files: Option<Vec<ModImportFileEntryInput>>,
) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(&app)?;
    let (game, source) = resolve_import_source(&paths.database_path, &gameId, &modPath)?;

    let workspace_mods_dir = Path::new(&game.path).join("G2M").join("mods");
    fs::create_dir_all(&workspace_mods_dir)
        .map_err(|error| format!("failed to create workspace mods directory: {error}"))?;

    let source_name = modName
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(source.display_name.as_str());
    if source_name.is_empty() {
        return Err("无法识别 Mod 文件夹名称".to_string());
    }
    let target_dir = unique_directory_path(&workspace_mods_dir, source_name);

    copy_directory_recursive(&source.source_dir, &target_dir)?;

    let file_overrides = files.as_ref().map(|entries| {
        entries
            .iter()
            .map(|file| ImportFileOverride {
                relative_path: file.relative_path.trim().replace('\\', "/"),
                target_path: file.target_path.trim().to_string(),
            })
            .collect::<Vec<_>>()
    });

    let import_result = import_mod_into_database(
        &paths.database_path,
        &gameId,
        &target_dir,
        Some(source_name),
        file_overrides.as_deref(),
    );

    if let Err(error) = import_result {
        let _ = fs::remove_dir_all(&target_dir);
        return Err(error);
    }

    bootstrap_app(app)
}

fn ensure_storage(app: &AppHandle) -> Result<StoragePaths, String> {
    let _ = app;
    let executable_path =
        std::env::current_exe().map_err(|error| format!("failed to resolve executable path: {error}"))?;
    let app_dir = executable_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve application directory".to_string())?;
    let config_dir = app_dir.join("config");

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("failed to create config directory: {error}"))?;
    let custom_assets_dir = app_dir.join("assets").join("custom");
    fs::create_dir_all(&custom_assets_dir)
        .map_err(|error| format!("failed to create custom assets directory: {error}"))?;

    let database_path = config_dir.join("database.db");
    initialize_database(&database_path)?;
    migrate_legacy_settings_to_database(&database_path, &config_dir.join("settings.json"))?;
    migrate_legacy_settings_to_database(&database_path, &app_dir.join("settings.json"))?;

    Ok(StoragePaths {
        app_dir,
        database_path,
        custom_assets_dir,
    })
}

fn ensure_game_workspaces(games: &[GameDirectory]) -> Result<(), String> {
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

fn ensure_game_workspace(game_path: &Path) -> Result<(), String> {
    let workspace_dir = game_path.join("G2M");
    let mods_dir = workspace_dir.join("mods");

    fs::create_dir_all(&mods_dir).map_err(|error| {
        format!(
            "failed to create game workspace under {}: {error}",
            workspace_dir.to_string_lossy()
        )
    })?;

    Ok(())
}

fn initialize_database(database_path: &Path) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS mods (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                mod_type TEXT NOT NULL DEFAULT 'Mixed',
                author TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                source_dir TEXT NOT NULL DEFAULT '',
                installed_at INTEGER NOT NULL DEFAULT 0,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                enabled INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                game_type TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                exe_name TEXT NOT NULL,
                version TEXT NOT NULL DEFAULT '',
                image_path TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY,
                mod_id TEXT NOT NULL,
                source_path TEXT NOT NULL,
                target_path TEXT NOT NULL,
                target_folder TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (mod_id) REFERENCES mods(id) ON DELETE CASCADE
            );
            ",
        )
        .map_err(|error| format!("failed to initialize database schema: {error}"))?;

    ensure_table_column(&connection, "games", "image_path", "TEXT NOT NULL DEFAULT ''")?;
    ensure_table_column(&connection, "games", "created_at", "INTEGER NOT NULL DEFAULT 0")?;
    ensure_table_column(&connection, "games", "updated_at", "INTEGER NOT NULL DEFAULT 0")?;
    ensure_table_column(&connection, "mods", "game_id", "TEXT NOT NULL DEFAULT ''")?;
    ensure_table_column(
        &connection,
        "mods",
        "mod_type",
        "TEXT NOT NULL DEFAULT 'Mixed'",
    )?;
    ensure_table_column(&connection, "mods", "author", "TEXT NOT NULL DEFAULT ''")?;
    ensure_table_column(
        &connection,
        "mods",
        "description",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_table_column(
        &connection,
        "mods",
        "source_dir",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_table_column(
        &connection,
        "mods",
        "installed_at",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    ensure_table_column(&connection, "mods", "size_bytes", "INTEGER NOT NULL DEFAULT 0")?;
    ensure_table_column(
        &connection,
        "files",
        "target_folder",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    connection
        .execute(
            "
            UPDATE games
            SET created_at = CASE WHEN created_at = 0 THEN strftime('%s','now') ELSE created_at END,
                updated_at = CASE WHEN updated_at = 0 THEN strftime('%s','now') ELSE updated_at END
            ",
            [],
        )
        .map_err(|error| format!("failed to backfill game timestamps: {error}"))?;

    Ok(())
}

fn migrate_legacy_settings_to_database(database_path: &Path, settings_path: &Path) -> Result<(), String> {
    if !settings_path.exists() {
        return Ok(());
    }

    let legacy_games = read_legacy_settings_file(settings_path)?;
    if !legacy_games.is_empty() {
        insert_missing_game_entries(database_path, &legacy_games)?;
    }

    fs::remove_file(settings_path).map_err(|error| {
        format!(
            "failed to remove legacy settings file {}: {error}",
            settings_path.to_string_lossy()
        )
    })?;

    Ok(())
}

fn load_mods(database_path: &Path) -> Result<Vec<StoredMod>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, game_id, name, mod_type, author, enabled, description, source_dir, installed_at, size_bytes
            FROM mods
            ORDER BY game_id COLLATE NOCASE ASC, name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare mod query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(StoredMod {
                id: row.get(0)?,
                game_id: row.get(1)?,
                name: row.get(2)?,
                mod_type: row.get(3)?,
                author: row.get(4)?,
                enabled: row.get::<_, i64>(5)? != 0,
                file_count: 0,
                conflicts: 0,
                size_bytes: row.get(9)?,
                installed_at: row.get(8)?,
                description: row.get(6)?,
                source_dir: row.get(7)?,
                target_folders: Vec::new(),
                preview_files: Vec::new(),
                conflict_files: Vec::new(),
                conflict_with: Vec::new(),
            })
        })
        .map_err(|error| format!("failed to query mods: {error}"))?;

    let mut mods = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read mods: {error}"))?;

    for mod_entry in &mut mods {
        mod_entry.target_folders =
            load_mod_target_folders(&connection, &mod_entry.id)?;
        mod_entry.preview_files =
            load_mod_preview_files(&connection, &mod_entry.id)?;
        mod_entry.file_count = load_mod_file_count(&connection, &mod_entry.id)?;
        mod_entry.conflict_files =
            load_mod_conflict_files(&connection, &mod_entry.id, &mod_entry.game_id)?;
        mod_entry.conflicts = mod_entry.conflict_files.len() as i64;
        mod_entry.conflict_with = mod_entry
            .conflict_files
            .iter()
            .map(|conflict| conflict.other_mod_name.clone())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
    }

    Ok(mods)
}

fn load_game_directories(database_path: &Path) -> Result<Vec<GameDirectory>, String> {
    Ok(load_stored_games(database_path)?
        .into_iter()
        .map(|game| GameDirectory {
            id: game.id,
            game_type: game.game_type,
            name: game.name,
            configured: !game.path.trim().is_empty(),
            path: game.path,
            exe_name: game.exe_name,
            version: game.version,
            image_path: game.image_path,
            created_at: game.created_at,
            updated_at: game.updated_at,
        })
        .collect())
}

fn load_stored_games(database_path: &Path) -> Result<Vec<StoredGameEntry>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, game_type, name, path, exe_name, version
                 , image_path, created_at, updated_at
            FROM games
            ORDER BY name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare game query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(StoredGameEntry {
                id: row.get(0)?,
                game_type: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                exe_name: row.get(4)?,
                version: row.get(5)?,
                image_path: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|error| format!("failed to query games: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read games: {error}"))
}

fn read_legacy_settings_file(settings_path: &Path) -> Result<Vec<StoredGameEntry>, String> {
    let content = fs::read_to_string(settings_path)
        .map_err(|error| format!("failed to read settings file: {error}"))?;

    if content.trim().is_empty() {
        return Ok(Vec::new());
    }

    if let Ok(settings) = serde_json::from_str::<Vec<StoredGameEntry>>(&content) {
        return Ok(settings);
    }

    if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
        if let Some(games) = settings.get("games") {
            if let Ok(entries) = serde_json::from_value::<Vec<StoredGameEntry>>(games.clone()) {
                return Ok(entries);
            }
        }
    }

    let legacy_settings = serde_json::from_str::<LegacySettingsFile>(&content)
        .map_err(|error| format!("failed to parse settings file: {error}"))?;

    let mut migrated_games = Vec::new();
    for legacy_game in legacy_settings.games {
        if legacy_game.path.trim().is_empty() {
            continue;
        }

        let game_type = match legacy_game.id.as_str() {
            "sa" => "sa",
            "vc" => "vc",
            "iii" => "iii",
            _ => continue,
        };

        migrated_games.push(StoredGameEntry {
            id: format!("legacy-{}", legacy_game.id),
            game_type: game_type.to_string(),
            name: canonical_game_name(game_type).to_string(),
            path: legacy_game.path,
            exe_name: canonical_exe_name(game_type).to_string(),
            version: String::new(),
            image_path: String::new(),
            created_at: current_timestamp(),
            updated_at: current_timestamp(),
        });
    }

    Ok(migrated_games)
}

fn insert_missing_game_entries(database_path: &Path, games: &[StoredGameEntry]) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    for game in games {
        let existing_path = connection
            .query_row(
                "SELECT id FROM games WHERE path = ?1 LIMIT 1",
                params![game.path],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("failed to inspect existing game entries: {error}"))?;

        if existing_path.is_some() {
            continue;
        }

        connection
            .execute(
                "
                INSERT INTO games (id, game_type, name, path, exe_name, version, image_path, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ",
                params![
                    game.id,
                    game.game_type,
                    game.name,
                    game.path,
                    game.exe_name,
                    game.version,
                    game.image_path,
                    game.created_at,
                    game.updated_at
                ],
            )
            .map_err(|error| format!("failed to migrate legacy game entry: {error}"))?;
    }

    Ok(())
}

fn insert_game_entry(database_path: &Path, game: &StoredGameEntry) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO games (id, game_type, name, path, exe_name, version, image_path, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ",
            params![
                game.id,
                game.game_type,
                game.name,
                game.path,
                game.exe_name,
                game.version,
                game.image_path,
                game.created_at,
                game.updated_at
            ],
        )
        .map_err(|error| format!("failed to insert game entry: {error}"))?;

    Ok(())
}

fn update_game_entry_in_database(
    database_path: &Path,
    game_id: &str,
    game_type: &str,
    name: &str,
    version: &str,
    image_path: &str,
    updated_at: i64,
) -> Result<usize, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute(
            "
            UPDATE games
            SET game_type = ?1, name = ?2, version = ?3, image_path = ?4, updated_at = ?5
            WHERE id = ?6
            ",
            params![game_type, name, version, image_path, updated_at, game_id],
        )
        .map_err(|error| format!("failed to update game entry: {error}"))
}

fn delete_game_entry_from_database(database_path: &Path, game_id: &str) -> Result<usize, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute("DELETE FROM games WHERE id = ?1", params![game_id])
        .map_err(|error| format!("failed to delete game entry: {error}"))
}

fn update_mod_enabled_in_database(
    database_path: &Path,
    mod_id: &str,
    enabled: bool,
) -> Result<usize, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute(
            "
            UPDATE mods
            SET enabled = ?1
            WHERE id = ?2
            ",
            params![if enabled { 1_i64 } else { 0_i64 }, mod_id],
        )
        .map_err(|error| format!("failed to update mod enabled state: {error}"))
}

fn detect_game_installation(game_path: &Path, games: &[StoredGameEntry]) -> Result<StoredGameEntry, String> {
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

fn default_game_name(game_type: &str, games: &[StoredGameEntry]) -> String {
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

fn canonical_game_name(id: &str) -> &'static str {
    match id {
        "sa" => "圣安地列斯",
        "vc" => "罪恶都市",
        "iii" => "GTA3",
        _ => "Unknown Game",
    }
}

fn normalize_game_type(game_type: &str) -> Result<&'static str, String> {
    match game_type.trim().to_lowercase().as_str() {
        "sa" => Ok("sa"),
        "vc" => Ok("vc"),
        "iii" => Ok("iii"),
        _ => Err("不支持的游戏类型".to_string()),
    }
}

fn canonical_exe_name(id: &str) -> &'static str {
    match id {
        "sa" => "gta_sa.exe",
        "vc" => "gta-vc.exe",
        "iii" => "gta3.exe",
        _ => "unknown.exe",
    }
}

fn build_game_id(game_type: &str) -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    format!("{game_type}-{timestamp}")
}

fn build_mod_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    format!("mod-{timestamp}-{}", random_suffix())
}

fn load_stored_game_by_id(database_path: &Path, game_id: &str) -> Result<Option<StoredGameEntry>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .query_row(
            "
            SELECT id, game_type, name, path, exe_name, version, image_path, created_at, updated_at
            FROM games
            WHERE id = ?1
            LIMIT 1
            ",
            params![game_id],
            |row| {
                Ok(StoredGameEntry {
                    id: row.get(0)?,
                    game_type: row.get(1)?,
                    name: row.get(2)?,
                    path: row.get(3)?,
                    exe_name: row.get(4)?,
                    version: row.get(5)?,
                    image_path: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load game entry: {error}"))
}

fn ensure_table_column(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    column_definition: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|error| format!("failed to inspect {table_name} table: {error}"))?;
    let column_names = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("failed to query {table_name} table info: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read {table_name} table info: {error}"))?;

    if column_names.iter().any(|name| name == column_name) {
        return Ok(());
    }

    connection
        .execute(
            &format!(
                "ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            ),
            [],
        )
        .map_err(|error| {
            format!("failed to add column {column_name} to {table_name} table: {error}")
        })?;

    Ok(())
}

fn delete_mods_for_game(database_path: &Path, game_id: &str) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare("SELECT id FROM mods WHERE game_id = ?1")
        .map_err(|error| format!("failed to prepare game mod query: {error}"))?;
    let mod_ids = statement
        .query_map(params![game_id], |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query game mods: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read game mods: {error}"))?;

    for mod_id in mod_ids {
        connection
            .execute("DELETE FROM files WHERE mod_id = ?1", params![mod_id])
            .map_err(|error| format!("failed to delete mod files: {error}"))?;
    }

    connection
        .execute("DELETE FROM mods WHERE game_id = ?1", params![game_id])
        .map_err(|error| format!("failed to delete game mods: {error}"))?;
    Ok(())
}

fn load_mod_target_folders(connection: &Connection, mod_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT DISTINCT target_folder
            FROM files
            WHERE mod_id = ?1 AND target_folder != ''
            ORDER BY target_folder COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare target folder query: {error}"))?;

    let rows = statement
        .query_map(params![mod_id], |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query target folders: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read target folders: {error}"))
}

fn load_mod_preview_files(connection: &Connection, mod_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT target_path
            FROM files
            WHERE mod_id = ?1
            ORDER BY target_path COLLATE NOCASE ASC
            LIMIT 5
            ",
        )
        .map_err(|error| format!("failed to prepare preview file query: {error}"))?;

    let rows = statement
        .query_map(params![mod_id], |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query preview files: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read preview files: {error}"))
}

fn load_mod_file_count(connection: &Connection, mod_id: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*) FROM files WHERE mod_id = ?1",
            params![mod_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("failed to count mod files: {error}"))
}

fn load_mod_conflict_files(
    connection: &Connection,
    mod_id: &str,
    game_id: &str,
) -> Result<Vec<StoredConflictFile>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT current_files.rowid,
                   current_files.source_path,
                   current_files.target_path,
                   current_files.target_folder,
                   other_mods.name,
                   other_files.source_path
            FROM files AS current_files
            INNER JOIN mods AS current_mods ON current_mods.id = current_files.mod_id
            INNER JOIN files AS other_files
                ON other_files.target_path = current_files.target_path
               AND other_files.mod_id != current_files.mod_id
            INNER JOIN mods AS other_mods
                ON other_mods.id = other_files.mod_id
               AND other_mods.game_id = ?2
            WHERE current_mods.id = ?1
            ORDER BY current_files.target_path COLLATE NOCASE ASC, other_mods.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare conflict query: {error}"))?;

    let rows = statement
        .query_map(params![mod_id, game_id], |row| {
            let target_path = row.get::<_, String>(2)?;
            let file_name = Path::new(&target_path)
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("unknown")
                .to_string();

            Ok(StoredConflictFile {
                id: format!("{}-{}", row.get::<_, i64>(0)?, random_suffix()),
                file_name,
                target_path,
                source_path: row.get(1)?,
                target_folder: row.get(3)?,
                other_mod_name: row.get(4)?,
                other_source_path: row.get(5)?,
            })
        })
        .map_err(|error| format!("failed to query conflict files: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read conflict files: {error}"))
}

fn load_preview_conflict_files(
    connection: &Connection,
    game_id: &str,
    imported_files: &[ImportedModFile],
) -> Result<Vec<StoredConflictFile>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT other_files.rowid,
                   other_files.target_path,
                   other_files.source_path,
                   other_files.target_folder,
                   other_mods.name
            FROM files AS other_files
            INNER JOIN mods AS other_mods
                ON other_mods.id = other_files.mod_id
               AND other_mods.game_id = ?2
            WHERE other_files.target_path = ?1
            ORDER BY other_mods.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare preview conflict query: {error}"))?;
    let mut conflict_files = Vec::new();

    for imported_file in imported_files {
        let rows = statement
            .query_map(params![imported_file.target_path, game_id], |row| {
                let target_path = row.get::<_, String>(1)?;
                let file_name = Path::new(&target_path)
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                Ok(StoredConflictFile {
                    id: format!("preview-{}-{}", row.get::<_, i64>(0)?, random_suffix()),
                    file_name,
                    target_path,
                    source_path: imported_file.source_path.clone(),
                    target_folder: row.get(3)?,
                    other_mod_name: row.get(4)?,
                    other_source_path: row.get(2)?,
                })
            })
            .map_err(|error| format!("failed to query preview conflicts: {error}"))?;

        let mut resolved_rows = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("failed to read preview conflicts: {error}"))?;
        conflict_files.append(&mut resolved_rows);
    }

    Ok(conflict_files)
}

fn store_game_cover_image(
    custom_assets_dir: &Path,
    game_type: &str,
    source_path: Option<&str>,
) -> Result<String, String> {
    let normalized_source = source_path
        .map(str::trim)
        .filter(|value| !value.is_empty());

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

fn cleanup_custom_game_cover(custom_assets_dir: &Path, image_path: &str) -> Result<(), String> {
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

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

fn random_suffix() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| format!("{:x}", duration.as_nanos()))
        .unwrap_or_else(|_| "0".to_string())
}

fn paths_equal(left: &Path, right: &Path) -> bool {
    let normalize = |path: &Path| path.to_string_lossy().replace('\\', "/").to_lowercase();
    normalize(left) == normalize(right)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            detect_game_directory,
            save_game_path,
            update_game_entry,
            delete_game_entry,
            update_mod_enabled,
            inspect_mod_source,
            preview_mod_directory,
            import_mod_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
