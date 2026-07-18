use rusqlite::{params, Connection, OptionalExtension};
use serde_json;
use std::path::{Path, PathBuf};

use crate::{
    mod_import::ImportedModFile, random_suffix, resolve_game_scoped_path, remove_path_if_exists,
    ExistingBuilderManifestLinkPayload, ModInstallFileRecord, ModInstallPlan, StoredConflictFile,
    StoredMod,
};

pub(crate) fn load_mods(database_path: &Path) -> Result<Vec<StoredMod>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare(
            "
            SELECT mods.id, mods.game_id, games.path, mods.name, mods.icon_base64, mods.version, mods.mod_type,
                   mods.author, mods.enabled, mods.description, mods.source_dir, mods.installed_at, mods.size_bytes,
                   mods.links_json, mods.modx_slug, mods.readme_path
            FROM mods
            INNER JOIN games ON games.id = mods.game_id
            ORDER BY mods.game_id COLLATE NOCASE ASC, mods.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare mod query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let game_path = row.get::<_, String>(2)?;
            let stored_source_dir = row.get::<_, String>(10)?;
            let links = parse_manifest_links(&row.get::<_, String>(13)?);
            let stored_modx_slug = row.get::<_, String>(14)?;
            let readme_path = row.get::<_, String>(15)?;
            Ok(StoredMod {
                id: row.get(0)?,
                game_id: row.get(1)?,
                name: row.get(3)?,
                icon_base64: row.get(4)?,
                version: row.get(5)?,
                mod_type: row.get(6)?,
                author: row.get(7)?,
                enabled: row.get::<_, i64>(8)? != 0,
                file_count: 0,
                conflicts: 0,
                size_bytes: row.get(12)?,
                installed_at: row.get(11)?,
                description: row.get(9)?,
                source_dir: resolve_game_scoped_path(Path::new(&game_path), &stored_source_dir)
                    .to_string_lossy()
                    .to_string(),
                target_folders: Vec::new(),
                preview_files: Vec::new(),
                conflict_files: Vec::new(),
                conflict_with: Vec::new(),
                modx_slug: normalize_modx_slug(&stored_modx_slug, &links),
                readme_path,
                links,
            })
        })
        .map_err(|error| format!("failed to query mods: {error}"))?;

    let mut mods = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read mods: {error}"))?;

    for mod_entry in &mut mods {
        mod_entry.target_folders = load_mod_target_folders(&connection, &mod_entry.id)?;
        mod_entry.preview_files = load_mod_preview_files(&connection, &mod_entry.id)?;
        mod_entry.file_count = load_mod_file_count(&connection, &mod_entry.id)?;
        mod_entry.conflict_files =
            load_mod_conflict_files(&connection, &mod_entry.id, &mod_entry.game_id)?;
        mod_entry.conflicts = mod_entry.conflict_files.len() as i64;
        mod_entry.conflict_with = mod_entry
            .conflict_files
            .iter()
            .map(|conflict| conflict.other_mod_name.clone())
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .collect();
    }

    Ok(mods)
}

pub(crate) fn load_mod_install_plan(
    database_path: &Path,
    mod_id: &str,
) -> Result<Option<ModInstallPlan>, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let install_context = connection
        .query_row(
            "
            SELECT games.path, mods.source_dir
            FROM mods
            INNER JOIN games ON games.id = mods.game_id
            WHERE mods.id = ?1
            LIMIT 1
            ",
            params![mod_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| format!("failed to load mod install context: {error}"))?;

    let Some((game_path, source_dir)) = install_context else {
        return Ok(None);
    };
    let resolved_game_path = PathBuf::from(&game_path);
    let resolved_source_dir = resolve_game_scoped_path(&resolved_game_path, &source_dir);

    let mut statement = connection
        .prepare(
            "
            SELECT source_path, target_path
            FROM files
            WHERE mod_id = ?1
            ORDER BY target_path COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare mod files query: {error}"))?;
    let files = statement
        .query_map(params![mod_id], |row| {
            let stored_source_path = row.get::<_, String>(0)?;
            Ok(ModInstallFileRecord {
                source_path: resolve_game_scoped_path(&resolved_game_path, &stored_source_path)
                    .to_string_lossy()
                    .to_string(),
                target_path: row.get(1)?,
            })
        })
        .map_err(|error| format!("failed to query mod files: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read mod files: {error}"))?;

    Ok(Some(ModInstallPlan {
        mod_id: mod_id.to_string(),
        game_path,
        source_dir: resolved_source_dir.to_string_lossy().to_string(),
        files,
    }))
}

pub(crate) fn delete_mod_by_id(database_path: &Path, mod_id: &str) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let game_path = connection
        .query_row(
            "
            SELECT games.path
            FROM mods
            INNER JOIN games ON games.id = mods.game_id
            WHERE mods.id = ?1
            LIMIT 1
            ",
            params![mod_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load backup cleanup game path: {error}"))?;
    connection
        .execute("DELETE FROM files WHERE mod_id = ?1", params![mod_id])
        .map_err(|error| format!("failed to delete mod file records: {error}"))?;
    connection
        .execute("DELETE FROM mods WHERE id = ?1", params![mod_id])
        .map_err(|error| format!("failed to delete mod record: {error}"))?;
    if let Some(game_path) = game_path {
        let backup_root = Path::new(&game_path)
            .join(crate::GAME_WORKSPACE_DIR_NAME)
            .join("backups")
            .join(mod_id);
        let _ = remove_path_if_exists(&backup_root);
    }
    Ok(())
}

pub(crate) fn update_mod_enabled_in_database(
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

pub(crate) fn update_mod_name_in_database(
    database_path: &Path,
    mod_id: &str,
    name: &str,
) -> Result<usize, String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    connection
        .execute(
            "
            UPDATE mods
            SET name = ?1
            WHERE id = ?2
            ",
            params![name, mod_id],
        )
        .map_err(|error| format!("failed to update mod name: {error}"))
}

pub(crate) fn delete_mods_for_game(database_path: &Path, game_id: &str) -> Result<(), String> {
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

pub(crate) fn load_preview_conflict_files(
    connection: &Connection,
    game_id: &str,
    imported_files: &[ImportedModFile],
) -> Result<Vec<StoredConflictFile>, String> {
    let game_path = connection
        .query_row(
            "SELECT path FROM games WHERE id = ?1 LIMIT 1",
            params![game_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load preview conflict game path: {error}"))?;
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
               AND other_mods.game_id = ?3
            WHERE other_files.target_path = ?1
               OR (?2 = 'modloader' AND other_files.target_folder = 'modloader' AND other_files.file_name = ?4)
            ORDER BY other_mods.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare preview conflict query: {error}"))?;
    let mut conflict_files = Vec::new();

    for imported_file in imported_files {
        if imported_file.target_path.trim().is_empty() {
            continue;
        }

        let file_name = Path::new(&imported_file.target_path)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        let rows = statement
            .query_map(params![imported_file.target_path, imported_file.target_folder, game_id, file_name], |row| {
                let other_source_path = row.get::<_, String>(2)?;
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
                    other_source_path: game_path
                        .as_deref()
                        .map(|path| {
                            resolve_game_scoped_path(Path::new(path), &other_source_path)
                                .to_string_lossy()
                                .to_string()
                        })
                        .unwrap_or(other_source_path),
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
    let game_path = connection
        .query_row(
            "SELECT path FROM games WHERE id = ?1 LIMIT 1",
            params![game_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load conflict game path: {error}"))?;
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
                ON other_files.mod_id != current_files.mod_id
               AND (
                   other_files.target_path = current_files.target_path
                   OR (
                       current_files.target_folder = 'modloader'
                       AND other_files.target_folder = 'modloader'
                       AND other_files.file_name = current_files.file_name
                   )
               )
            INNER JOIN mods AS other_mods
                ON other_mods.id = other_files.mod_id
               AND other_mods.game_id = ?2
            WHERE current_mods.id = ?1
              AND current_files.target_path != ''
            ORDER BY current_files.target_path COLLATE NOCASE ASC, other_mods.name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare conflict query: {error}"))?;

    let rows = statement
        .query_map(params![mod_id, game_id], |row| {
            let source_path = row.get::<_, String>(1)?;
            let target_path = row.get::<_, String>(2)?;
            let other_source_path = row.get::<_, String>(5)?;
            let file_name = Path::new(&target_path)
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("unknown")
                .to_string();

            Ok(StoredConflictFile {
                id: format!("{}-{}", row.get::<_, i64>(0)?, random_suffix()),
                file_name,
                target_path,
                source_path: game_path
                    .as_deref()
                    .map(|path| {
                        resolve_game_scoped_path(Path::new(path), &source_path)
                            .to_string_lossy()
                            .to_string()
                    })
                    .unwrap_or(source_path),
                target_folder: row.get(3)?,
                other_mod_name: row.get(4)?,
                other_source_path: game_path
                    .as_deref()
                    .map(|path| {
                        resolve_game_scoped_path(Path::new(path), &other_source_path)
                            .to_string_lossy()
                            .to_string()
                    })
                    .unwrap_or(other_source_path),
            })
        })
        .map_err(|error| format!("failed to query conflict files: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read conflict files: {error}"))
}

fn parse_manifest_links(raw_links_json: &str) -> Vec<ExistingBuilderManifestLinkPayload> {
    serde_json::from_str::<Vec<ExistingBuilderManifestLinkPayload>>(raw_links_json)
        .unwrap_or_default()
}

fn normalize_modx_slug(
    stored_modx_slug: &str,
    links: &[ExistingBuilderManifestLinkPayload],
) -> String {
    let normalized_slug = stored_modx_slug.trim();
    if !normalized_slug.is_empty() {
        return normalized_slug.to_string();
    }

    links.iter().find_map(|link| extract_modx_slug_from_url(&link.url)).unwrap_or_default()
}

fn extract_modx_slug_from_url(url: &str) -> Option<String> {
    let normalized = url.trim();
    if normalized.is_empty() {
        return None;
    }

    let without_query = normalized.split('?').next().unwrap_or(normalized);
    let without_hash = without_query.split('#').next().unwrap_or(without_query);
    let lower = without_hash.to_ascii_lowercase();
    let marker = "/mods/";
    let start = lower.find(marker)?;
    let slug = without_hash[start + marker.len()..].trim_matches('/');

    (!slug.is_empty()).then(|| slug.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{Connection, params};
    use crate::game_repository::initialize_database;
    use std::path::PathBuf;
    use tempfile::tempdir;

    #[test]
    fn test_cross_folder_conflict_detection() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        initialize_database(&db_path).unwrap();

        let mut conn = Connection::open(&db_path).unwrap();

        let game_id = "test_game_1";
        conn.execute("INSERT INTO games (id, path, game_type, name, exe_name) VALUES (?1, 'C:\\Games\\GTA', 'sa', 'GTA SA', 'gta_sa.exe')", params![game_id]).unwrap();

        let mod1_id = "mod1";
        let mod2_id = "mod2";
        conn.execute("INSERT INTO mods (id, game_id, name, version, author, description, enabled, source_dir, installed_at) VALUES (?1, ?2, 'Mod 1', '1.0', '', '', 1, 'C:\\Mods\\1', 0)", params![mod1_id, game_id]).unwrap();
        conn.execute("INSERT INTO mods (id, game_id, name, version, author, description, enabled, source_dir, installed_at) VALUES (?1, ?2, 'Mod 2', '1.0', '', '', 1, 'C:\\Mods\\2', 0)", params![mod2_id, game_id]).unwrap();

        // mod1 has a file in modloader/cars/
        conn.execute("INSERT INTO files (mod_id, source_path, target_path, target_folder, file_name) VALUES (?1, 'car.dff', 'modloader/cars/car.dff', 'modloader', 'car.dff')", params![mod1_id]).unwrap();
        
        // mod2 has a file with the same name in modloader/vehicles/
        conn.execute("INSERT INTO files (mod_id, source_path, target_path, target_folder, file_name) VALUES (?1, 'car.dff', 'modloader/vehicles/car.dff', 'modloader', 'car.dff')", params![mod2_id]).unwrap();

        // mod2 also has a file with same target_path as another file in mod1
        conn.execute("INSERT INTO files (mod_id, source_path, target_path, target_folder, file_name) VALUES (?1, 'script.cs', 'cleo/script.cs', 'cleo', 'script.cs')", params![mod1_id]).unwrap();
        conn.execute("INSERT INTO files (mod_id, source_path, target_path, target_folder, file_name) VALUES (?1, 'script.cs', 'cleo/script.cs', 'cleo', 'script.cs')", params![mod2_id]).unwrap();

        let conflicts = load_mod_conflict_files(&conn, mod2_id, game_id).unwrap();
        
        assert_eq!(conflicts.len(), 2);
        
        let mut target_paths: Vec<String> = conflicts.iter().map(|c| c.target_path.clone()).collect();
        target_paths.sort();
        
        assert_eq!(target_paths[0], "cleo/script.cs");
        assert_eq!(target_paths[1], "modloader/vehicles/car.dff");
    }
}
