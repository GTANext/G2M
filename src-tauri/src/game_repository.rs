use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

use crate::{
    canonical_exe_name, canonical_game_name, current_timestamp, GameDirectory, LegacySettingsFile,
    StoredGameEntry,
};

pub(crate) fn initialize_database(database_path: &Path) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS mods (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL DEFAULT '',
                name TEXT NOT NULL,
                icon_base64 TEXT NOT NULL DEFAULT '',
                version TEXT NOT NULL DEFAULT '',
                mod_type TEXT NOT NULL DEFAULT 'Mixed',
                author TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                source_dir TEXT NOT NULL DEFAULT '',
                installed_at INTEGER NOT NULL DEFAULT 0,
                size_bytes INTEGER NOT NULL DEFAULT 0,
                enabled INTEGER NOT NULL DEFAULT 0,
                links_json TEXT NOT NULL DEFAULT '[]',
                modx_slug TEXT NOT NULL DEFAULT ''
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
                updated_at INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0
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
    ensure_table_column(&connection, "games", "sort_order", "INTEGER NOT NULL DEFAULT 0")?;
    ensure_table_column(&connection, "mods", "game_id", "TEXT NOT NULL DEFAULT ''")?;
    ensure_table_column(&connection, "mods", "icon_base64", "TEXT NOT NULL DEFAULT ''")?;
    ensure_table_column(&connection, "mods", "version", "TEXT NOT NULL DEFAULT ''")?;
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
    ensure_table_column(&connection, "mods", "links_json", "TEXT NOT NULL DEFAULT '[]'")?;
    ensure_table_column(&connection, "mods", "modx_slug", "TEXT NOT NULL DEFAULT ''")?;
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

pub(crate) fn migrate_legacy_settings_to_database(
    database_path: &Path,
    settings_path: &Path,
) -> Result<(), String> {
    if !settings_path.exists() {
        return Ok(());
    }

    let legacy_games = read_legacy_settings_file(settings_path)?;
    if !legacy_games.is_empty() {
        insert_missing_game_entries(database_path, &legacy_games)?;
    }

    std::fs::remove_file(settings_path).map_err(|error| {
        format!(
            "failed to remove legacy settings file {}: {error}",
            settings_path.to_string_lossy()
        )
    })?;

    Ok(())
}

pub(crate) fn load_game_directories(database_path: &Path) -> Result<Vec<GameDirectory>, String> {
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
            sort_order: game.sort_order,
            prerequisites: Vec::new(),
            link_health: crate::GameLinkHealthPayload::default(),
        })
        .collect())
}

pub(crate) fn load_stored_games(database_path: &Path) -> Result<Vec<StoredGameEntry>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, game_type, name, path, exe_name, version
                 , image_path, created_at, updated_at, sort_order
            FROM games
            ORDER BY sort_order ASC, created_at DESC, name COLLATE NOCASE ASC
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
                sort_order: row.get(9)?,
            })
        })
        .map_err(|error| format!("failed to query games: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read games: {error}"))
}

pub(crate) fn insert_game_entry(database_path: &Path, game: &StoredGameEntry) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute(
            "
            INSERT INTO games (id, game_type, name, path, exe_name, version, image_path, created_at, updated_at, sort_order)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
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
                game.updated_at,
                game.sort_order
            ],
        )
        .map_err(|error| format!("failed to insert game entry: {error}"))?;

    Ok(())
}

pub(crate) fn update_game_entry_in_database(
    database_path: &Path,
    game_id: &str,
    game_type: &str,
    name: &str,
    exe_name: &str,
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
            SET game_type = ?1, name = ?2, exe_name = ?3, version = ?4, image_path = ?5, updated_at = ?6
            WHERE id = ?7
            ",
            params![game_type, name, exe_name, version, image_path, updated_at, game_id],
        )
        .map_err(|error| format!("failed to update game entry: {error}"))
}

pub(crate) fn delete_game_entry_from_database(
    database_path: &Path,
    game_id: &str,
) -> Result<usize, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute("DELETE FROM games WHERE id = ?1", params![game_id])
        .map_err(|error| format!("failed to delete game entry: {error}"))
}

pub(crate) fn load_stored_game_by_id(
    database_path: &Path,
    game_id: &str,
) -> Result<Option<StoredGameEntry>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .query_row(
            "
            SELECT id, game_type, name, path, exe_name, version, image_path, created_at, updated_at, sort_order
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
                    sort_order: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load game entry: {error}"))
}

fn read_legacy_settings_file(settings_path: &Path) -> Result<Vec<StoredGameEntry>, String> {
    let content = std::fs::read_to_string(settings_path)
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
            sort_order: 0,
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
                INSERT INTO games (id, game_type, name, path, exe_name, version, image_path, created_at, updated_at, sort_order)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
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
                    game.updated_at,
                    game.sort_order
                ],
            )
            .map_err(|error| format!("failed to migrate legacy game entry: {error}"))?;
    }

    Ok(())
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
