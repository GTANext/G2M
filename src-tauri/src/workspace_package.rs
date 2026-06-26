use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
};

use crate::{
    build_game_scoped_storage_path, build_mod_id, current_timestamp, game_workspace_package_path,
    infer_target_folder_from_target_path, normalize_import_target_path, resolve_game_scoped_path,
    system_time_to_timestamp, GameDirectory,
    GAME_WORKSPACE_PACKAGE_FILE_NAME, GAME_WORKSPACE_PACKAGE_VERSION,
};

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameWorkspacePackage {
    pub(crate) version: u32,
    pub(crate) game_type: String,
    pub(crate) name: String,
    pub(crate) last_modified_at: i64,
    pub(crate) cover_base64: Option<String>,
    pub(crate) mods: Vec<GameWorkspacePackageMod>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameWorkspacePackageMod {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) version: String,
    pub(crate) mod_type: String,
    pub(crate) author: String,
    pub(crate) description: String,
    pub(crate) enabled: bool,
    pub(crate) installed_at: i64,
    pub(crate) size_bytes: i64,
    pub(crate) source_dir: String,
    pub(crate) last_modified_at: i64,
    pub(crate) files: Vec<GameWorkspacePackageFile>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameWorkspacePackageFile {
    pub(crate) source_path: String,
    pub(crate) target_path: String,
    pub(crate) target_folder: String,
    #[serde(default)]
    pub(crate) kind: String,
    #[serde(default)]
    pub(crate) file_count: i64,
    pub(crate) md5: String,
}

#[derive(Debug)]
struct ResolvedPackageModFileRecord {
    source_path: PathBuf,
    relative_path: String,
    target_path: String,
    target_folder: String,
}

pub(crate) fn ensure_game_workspace_package_path(workspace_dir: &Path) -> Result<(), String> {
    let package_path = workspace_dir.join(GAME_WORKSPACE_PACKAGE_FILE_NAME);
    if package_path.exists() {
        return Ok(());
    }

    let package = GameWorkspacePackage {
        version: GAME_WORKSPACE_PACKAGE_VERSION,
        ..GameWorkspacePackage::default()
    };
    write_game_workspace_package(&package_path, &package)
}

pub(crate) fn read_game_workspace_package(
    package_path: &Path,
) -> Result<Option<GameWorkspacePackage>, String> {
    if !package_path.is_file() {
        return Ok(None);
    }

    let content = fs::read_to_string(package_path)
        .map_err(|error| format!("failed to read {}: {error}", package_path.display()))?;
    if content.trim().is_empty() {
        return Ok(None);
    }

    let package = serde_json::from_str::<GameWorkspacePackage>(&content)
        .map_err(|error| format!("failed to parse {}: {error}", package_path.display()))?;
    Ok(Some(package))
}

pub(crate) fn write_game_workspace_package(
    package_path: &Path,
    package: &GameWorkspacePackage,
) -> Result<(), String> {
    if let Some(parent_dir) = package_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to create package directory: {error}"))?;
    }

    let content = serde_json::to_string_pretty(package)
        .map_err(|error| format!("failed to serialize game workspace package: {error}"))?;
    fs::write(package_path, content)
        .map_err(|error| format!("failed to write {}: {error}", package_path.display()))
}

pub(crate) fn update_game_workspace_package_info(
    workspace_dir: &Path,
    name: &str,
    game_type: &str,
    image_base64: &str,
) -> Result<(), String> {
    let package_path = workspace_dir.join(GAME_WORKSPACE_PACKAGE_FILE_NAME);
    let mut package = if package_path.is_file() {
        let content = fs::read_to_string(&package_path)
            .map_err(|error| format!("failed to read {}: {error}", package_path.display()))?;
        if content.trim().is_empty() {
            GameWorkspacePackage::default()
        } else {
            serde_json::from_str::<GameWorkspacePackage>(&content)
                .map_err(|error| format!("failed to parse {}: {error}", package_path.display()))?
        }
    } else {
        GameWorkspacePackage::default()
    };

    package.version = GAME_WORKSPACE_PACKAGE_VERSION;
    package.name = name.to_string();
    package.game_type = game_type.to_string();
    package.cover_base64 = Some(image_base64.to_string());
    package.last_modified_at = current_timestamp();

    write_game_workspace_package(&package_path, &package)
}

pub(crate) fn import_game_packages_into_database(
    database_path: &Path,
    games: &[GameDirectory],
) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;

    for game in games {
        if game.path.trim().is_empty() {
            continue;
        }

        let mod_count = load_game_mod_count(&connection, &game.id)?;
        if mod_count > 0 {
            continue;
        }

        import_game_package_into_database_if_needed(&connection, game)?;
    }

    Ok(())
}

pub(crate) fn sync_game_packages(database_path: &Path, games: &[GameDirectory]) -> Result<(), String> {
    for game in games {
        if game.path.trim().is_empty() {
            continue;
        }

        sync_game_package(database_path, game)?;
    }

    Ok(())
}

fn import_game_package_into_database_if_needed(
    connection: &Connection,
    game: &GameDirectory,
) -> Result<(), String> {
    let package_path = game_workspace_package_path(Path::new(&game.path));
    let Some(package) = read_game_workspace_package(&package_path)? else {
        return Ok(());
    };

    if package.mods.is_empty() {
        return Ok(());
    }

    for package_mod in package.mods {
        let mod_id = build_mod_id();
        let resolved_source_dir =
            resolve_game_scoped_path(Path::new(&game.path), &package_mod.source_dir);
        if !resolved_source_dir.exists() {
            continue;
        }
        let stored_source_dir =
            build_game_scoped_storage_path(Path::new(&game.path), &resolved_source_dir);

        connection
            .execute(
                "
                INSERT INTO mods (
                    id, game_id, name, version, mod_type, author, description, source_dir, installed_at, size_bytes, enabled
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ",
                params![
                    mod_id,
                    game.id,
                    package_mod.name.trim(),
                    package_mod.version.trim(),
                    package_mod.mod_type.trim(),
                    package_mod.author.trim(),
                    package_mod.description.trim(),
                    stored_source_dir,
                    package_mod.installed_at,
                    package_mod.size_bytes,
                    if package_mod.enabled { 1_i64 } else { 0_i64 }
                ],
            )
            .map_err(|error| format!("failed to import package mod into database: {error}"))?;

        let explicit_file_sources = package_mod
            .files
            .iter()
            .filter_map(|package_file| {
                let resolved_source_path =
                    resolve_game_scoped_path(Path::new(&game.path), &package_file.source_path);
                (package_file.kind != "folder" && resolved_source_path.is_file()).then(|| {
                    normalize_source_key(&resolved_source_path)
                })
            })
            .collect::<HashSet<_>>();

        for package_file in package_mod.files {
            if package_file.target_path.trim().is_empty() {
                continue;
            }

            let resolved_source_path =
                resolve_game_scoped_path(Path::new(&game.path), &package_file.source_path);
            let normalized_target_path = normalize_import_target_path(&package_file.target_path);
            if normalized_target_path.is_empty() {
                continue;
            }

            if package_file.kind == "folder" || resolved_source_path.is_dir() {
                import_package_directory_entry(
                    connection,
                    &mod_id,
                    Path::new(&game.path),
                    &resolved_source_path,
                    &normalized_target_path,
                    &explicit_file_sources,
                )?;
                continue;
            }

            if !resolved_source_path.is_file() {
                continue;
            }

            insert_package_file_record(
                connection,
                &mod_id,
                Path::new(&game.path),
                &resolved_source_path,
                &normalized_target_path,
                package_file.target_folder.trim(),
            )?;
        }
    }

    Ok(())
}

fn sync_game_package(database_path: &Path, game: &GameDirectory) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, version, mod_type, author, description, source_dir, installed_at, size_bytes, enabled
            FROM mods
            WHERE game_id = ?1
            ORDER BY installed_at ASC, name COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare game package mod query: {error}"))?;

    let mod_rows = statement
        .query_map(params![game.id.as_str()], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
                row.get::<_, i64>(9)? != 0,
            ))
        })
        .map_err(|error| format!("failed to query mods for package sync: {error}"))?;

    let mut package_mods = Vec::new();
    for mod_row in mod_rows {
        let (
            mod_id,
            name,
            version,
            mod_type,
            author,
            description,
            stored_source_dir,
            installed_at,
            size_bytes,
            enabled,
        ) = mod_row.map_err(|error| format!("failed to read game package mod row: {error}"))?;
        let source_dir = resolve_game_scoped_path(Path::new(&game.path), &stored_source_dir);
        let files =
            load_game_package_mod_files(&connection, Path::new(&game.path), &source_dir, &mod_id)?;
        let last_modified_at =
            determine_directory_last_modified_timestamp(&source_dir).unwrap_or(installed_at);

        package_mods.push(GameWorkspacePackageMod {
            id: mod_id,
            name,
            version,
            mod_type,
            author,
            description,
            enabled,
            installed_at,
            size_bytes,
            source_dir: build_game_scoped_storage_path(Path::new(&game.path), &source_dir),
            last_modified_at,
            files,
        });
    }

    let package = GameWorkspacePackage {
        version: GAME_WORKSPACE_PACKAGE_VERSION,
        game_type: game.game_type.clone(),
        name: game.name.clone(),
        last_modified_at: current_timestamp(),
        cover_base64: Some(game.image_path.clone()),
        mods: package_mods,
    };
    write_game_workspace_package(&game_workspace_package_path(Path::new(&game.path)), &package)
}

fn load_game_package_mod_files(
    connection: &Connection,
    game_path: &Path,
    mod_source_dir: &Path,
    mod_id: &str,
) -> Result<Vec<GameWorkspacePackageFile>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT source_path, target_path, target_folder
            FROM files
            WHERE mod_id = ?1
            ORDER BY target_path COLLATE NOCASE ASC
            ",
        )
        .map_err(|error| format!("failed to prepare package mod file query: {error}"))?;

    let rows = statement
        .query_map(params![mod_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|error| format!("failed to query package mod files: {error}"))?;

    let mut records = Vec::new();
    for row in rows {
        let (stored_source_path, target_path, target_folder) =
            row.map_err(|error| format!("failed to read package mod file row: {error}"))?;
        let resolved_source_path = resolve_game_scoped_path(game_path, &stored_source_path);
        let normalized_target_path = normalize_import_target_path(&target_path);
        if normalized_target_path.is_empty() {
            continue;
        }

        let relative_path = resolved_source_path
            .strip_prefix(mod_source_dir)
            .map_err(|error| format!("failed to build package relative path: {error}"))?
            .to_string_lossy()
            .replace('\\', "/");
        records.push(ResolvedPackageModFileRecord {
            source_path: resolved_source_path,
            relative_path,
            target_path: normalized_target_path.clone(),
            target_folder: if target_folder.trim().is_empty() {
                infer_target_folder_from_target_path(&normalized_target_path)
            } else {
                target_folder
            },
        });
    }

    summarize_package_mod_files(game_path, mod_source_dir, &records)
}

fn summarize_package_mod_files(
    game_path: &Path,
    mod_source_dir: &Path,
    records: &[ResolvedPackageModFileRecord],
) -> Result<Vec<GameWorkspacePackageFile>, String> {
    let mut summaries = Vec::new();
    let mut folder_groups = HashMap::<String, Vec<&ResolvedPackageModFileRecord>>::new();

    for record in records {
        let segments = record
            .relative_path
            .split('/')
            .filter(|segment| !segment.is_empty())
            .collect::<Vec<_>>();
        if segments.len() <= 1 {
            summaries.push(build_package_file_summary(game_path, &record.source_path, &record.target_path, &record.target_folder)?);
            continue;
        }

        folder_groups
            .entry(segments[0].to_string())
            .or_default()
            .push(record);
    }

    for (folder_name, group_records) in folder_groups {
        let folder_source_path = mod_source_dir.join(&folder_name);
        let actual_relative_paths =
            collect_relative_file_paths(&folder_source_path, &folder_source_path)?;
        let mut candidate_groups = HashMap::<String, Vec<&ResolvedPackageModFileRecord>>::new();

        for record in &group_records {
            if let Some(candidate) = infer_folder_target_candidate(&folder_name, record) {
                candidate_groups.entry(candidate).or_default().push(*record);
            }
        }

        let dominant = candidate_groups
            .into_iter()
            .max_by_key(|(_, grouped_records)| grouped_records.len());
        let Some((folder_target_path, summarized_records)) = dominant else {
            for record in group_records {
                summaries.push(build_package_file_summary(game_path, &record.source_path, &record.target_path, &record.target_folder)?);
            }
            continue;
        };

        if summarized_records.len() < 2 {
            for record in group_records {
                summaries.push(build_package_file_summary(game_path, &record.source_path, &record.target_path, &record.target_folder)?);
            }
            continue;
        }

        let summarized_relative_paths = summarized_records
            .iter()
            .filter_map(|record| {
                record
                    .relative_path
                    .strip_prefix(&format!("{folder_name}/"))
                    .map(str::to_string)
            })
            .collect::<HashSet<_>>();
        let can_summarize_folder = !summarized_relative_paths.is_empty()
            && summarized_relative_paths
                .iter()
                .all(|path| actual_relative_paths.contains(path));

        if can_summarize_folder {
            summaries.push(GameWorkspacePackageFile {
                source_path: build_game_scoped_storage_path(game_path, &folder_source_path),
                target_path: folder_target_path.clone(),
                target_folder: infer_target_folder_from_target_path(&folder_target_path),
                kind: "folder".to_string(),
                file_count: summarized_records.len() as i64,
                md5: String::new(),
            });
        }

        for record in group_records {
            let is_covered_by_folder = can_summarize_folder
                && record
                    .relative_path
                    .strip_prefix(&format!("{folder_name}/"))
                    .map(|path| summarized_relative_paths.contains(path))
                    .unwrap_or(false);
            if is_covered_by_folder {
                continue;
            }

            summaries.push(build_package_file_summary(game_path, &record.source_path, &record.target_path, &record.target_folder)?);
        }
    }

    summaries.sort_by(|left, right| left.target_path.cmp(&right.target_path));
    Ok(summaries)
}

fn build_package_file_summary(
    game_path: &Path,
    source_path: &Path,
    target_path: &str,
    target_folder: &str,
) -> Result<GameWorkspacePackageFile, String> {
    Ok(GameWorkspacePackageFile {
        source_path: build_game_scoped_storage_path(game_path, source_path),
        target_path: target_path.to_string(),
        target_folder: if target_folder.trim().is_empty() {
            infer_target_folder_from_target_path(target_path)
        } else {
            target_folder.to_string()
        },
        kind: "file".to_string(),
        file_count: 1,
        md5: compute_file_md5(source_path)?,
    })
}

fn import_package_directory_entry(
    connection: &Connection,
    mod_id: &str,
    game_path: &Path,
    source_dir: &Path,
    target_dir: &str,
    explicit_file_sources: &HashSet<String>,
) -> Result<(), String> {
    for relative_path in collect_relative_file_paths(source_dir, source_dir)? {
        let source_path = source_dir.join(relative_path.replace('/', "\\"));
        if explicit_file_sources.contains(&normalize_source_key(&source_path)) {
            continue;
        }

        let target_path = join_package_target_path(target_dir, &relative_path);
        insert_package_file_record(connection, mod_id, game_path, &source_path, &target_path, "")?;
    }

    Ok(())
}

fn insert_package_file_record(
    connection: &Connection,
    mod_id: &str,
    game_path: &Path,
    source_path: &Path,
    target_path: &str,
    target_folder: &str,
) -> Result<(), String> {
    let stored_source_path = build_game_scoped_storage_path(game_path, source_path);
    let resolved_target_folder = if target_folder.trim().is_empty() {
        infer_target_folder_from_target_path(target_path)
    } else {
        target_folder.trim().to_string()
    };

    connection
        .execute(
            "
            INSERT INTO files (mod_id, source_path, target_path, target_folder)
            VALUES (?1, ?2, ?3, ?4)
            ",
            params![mod_id, stored_source_path, target_path, resolved_target_folder],
        )
        .map_err(|error| format!("failed to import package mod file into database: {error}"))?;

    Ok(())
}

fn collect_relative_file_paths(base_dir: &Path, current_dir: &Path) -> Result<HashSet<String>, String> {
    let mut entries = HashSet::new();

    for entry in fs::read_dir(current_dir)
        .map_err(|error| format!("failed to read package source directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read package source entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            entries.extend(collect_relative_file_paths(base_dir, &path)?);
            continue;
        }
        if !path.is_file() {
            continue;
        }

        let relative_path = path
            .strip_prefix(base_dir)
            .map_err(|error| format!("failed to build package file relative path: {error}"))?
            .to_string_lossy()
            .replace('\\', "/");
        entries.insert(relative_path);
    }

    Ok(entries)
}

fn infer_folder_target_candidate(
    folder_name: &str,
    record: &ResolvedPackageModFileRecord,
) -> Option<String> {
    let prefix = format!("{folder_name}/");
    let relative_suffix = record.relative_path.strip_prefix(&prefix)?;
    if relative_suffix.is_empty() {
        return None;
    }

    let suffix = format!("/{relative_suffix}");
    record
        .target_path
        .strip_suffix(&suffix)
        .map(str::to_string)
}

fn join_package_target_path(base_target: &str, suffix: &str) -> String {
    let normalized_base = normalize_import_target_path(base_target);
    let normalized_suffix = normalize_import_target_path(suffix);
    if normalized_base.is_empty() {
        return normalized_suffix;
    }
    if normalized_suffix.is_empty() {
        return normalized_base;
    }

    format!("{normalized_base}/{normalized_suffix}")
}

fn normalize_source_key(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/").to_lowercase()
}

fn load_game_mod_count(connection: &Connection, game_id: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*) FROM mods WHERE game_id = ?1",
            params![game_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("failed to count game mods: {error}"))
}

fn determine_directory_last_modified_timestamp(source_dir: &Path) -> Option<i64> {
    let metadata = fs::metadata(source_dir).ok()?;
    let mut latest = metadata.modified().ok().and_then(system_time_to_timestamp);

    if !metadata.is_dir() {
        return latest;
    }

    for entry in fs::read_dir(source_dir).ok()? {
        let path = entry.ok()?.path();
        let current = determine_directory_last_modified_timestamp(&path);
        latest = match (latest, current) {
            (Some(left), Some(right)) => Some(left.max(right)),
            (None, Some(right)) => Some(right),
            (Some(left), None) => Some(left),
            (None, None) => None,
        };
    }

    latest
}

fn compute_file_md5(path: &Path) -> Result<String, String> {
    if !path.is_file() {
        return Ok(String::new());
    }

    let bytes = fs::read(path)
        .map_err(|error| format!("failed to read file for md5 {}: {error}", path.display()))?;
    Ok(format!("{:x}", md5::compute(bytes)))
}
