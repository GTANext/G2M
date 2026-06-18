use rusqlite::{params, Connection};
use std::{
    collections::{BTreeSet, HashMap},
    fs::{self, File},
    io,
    path::{Path, PathBuf},
};

use crate::{
    build_mod_id, current_timestamp, load_preview_conflict_files, load_stored_game_by_id,
    random_suffix, ModImportFileEntryPayload, ModImportPreviewPayload, StoredConflictFile,
    StoredGameEntry,
};

#[derive(Debug)]
pub(crate) struct ImportedModFile {
    pub(crate) relative_path: String,
    pub(crate) source_path: String,
    pub(crate) target_path: String,
    pub(crate) target_folder: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ImportFileOverride {
    pub(crate) relative_path: String,
    pub(crate) target_path: String,
}

#[derive(Debug)]
struct ImportedModSummary {
    name: String,
    mod_type: String,
    file_count: i64,
    size_bytes: i64,
    source_dir: String,
    has_g2m_manifest: bool,
    g2m_manifest_path: Option<String>,
    files: Vec<ImportedModFile>,
}

#[derive(Debug)]
pub(crate) struct PreparedImportSource {
    pub(crate) source_dir: PathBuf,
    pub(crate) display_name: String,
    cleanup_dir: Option<PathBuf>,
}

impl Drop for PreparedImportSource {
    fn drop(&mut self) {
        if let Some(cleanup_dir) = self.cleanup_dir.take() {
            let _ = fs::remove_dir_all(cleanup_dir);
        }
    }
}

pub(crate) fn prepare_import_source(mod_path: &str) -> Result<PreparedImportSource, String> {
    let normalized_path = mod_path.trim();
    let source_path = PathBuf::from(normalized_path);

    if normalized_path.is_empty() {
        return Err("选择的 Mod 来源为空".to_string());
    }
    if !source_path.exists() {
        return Err("选择的 Mod 来源不存在".to_string());
    }

    if source_path.is_dir() {
        let display_name = source_path
            .file_name()
            .and_then(|value| value.to_str())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "无法识别 Mod 文件夹名称".to_string())?
            .to_string();

        return Ok(PreparedImportSource {
            source_dir: source_path,
            display_name,
            cleanup_dir: None,
        });
    }

    if !source_path.is_file() {
        return Err("选择的 Mod 路径无效".to_string());
    }

    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .unwrap_or_default();

    if extension != "zip" {
        return Err("当前仅支持选择文件夹或 ZIP 压缩包".to_string());
    }

    let display_name = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "无法识别压缩包名称".to_string())?
        .to_string();
    let extraction_parent = std::env::temp_dir().join(format!("g2m-import-{}", random_suffix()));
    let extraction_root = extraction_parent.join(sanitize_folder_name(&display_name));
    fs::create_dir_all(&extraction_root)
        .map_err(|error| format!("failed to prepare archive extraction directory: {error}"))?;
    extract_zip_archive(&source_path, &extraction_root)?;
    let effective_source_dir = detect_import_root(&extraction_root)?;

    Ok(PreparedImportSource {
        source_dir: effective_source_dir,
        display_name,
        cleanup_dir: Some(extraction_parent),
    })
}

pub(crate) fn resolve_import_source(
    database_path: &Path,
    game_id: &str,
    mod_path: &str,
) -> Result<(StoredGameEntry, PreparedImportSource), String> {
    let game = load_stored_game_by_id(database_path, game_id)?
        .ok_or_else(|| "未找到对应的游戏记录".to_string())?;

    if game.path.trim().is_empty() {
        return Err("当前游戏还没有可用的安装目录".to_string());
    }

    Ok((game, prepare_import_source(mod_path)?))
}

pub(crate) fn import_mod_into_database(
    database_path: &Path,
    game_id: &str,
    mod_dir: &Path,
    mod_name_override: Option<&str>,
    file_overrides: Option<&[ImportFileOverride]>,
) -> Result<(), String> {
    let mut import_summary = scan_imported_mod_directory(mod_dir, mod_name_override)?;
    apply_import_file_overrides(&mut import_summary.files, file_overrides)?;
    if import_summary.files.is_empty() {
        return Err("选择的 Mod 文件夹里没有可导入的文件".to_string());
    }

    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let mod_id = build_mod_id();
    let installed_at = current_timestamp();

    connection
        .execute(
            "
            INSERT INTO mods (
                id, game_id, name, mod_type, author, description, source_dir, installed_at, size_bytes, enabled
            )
            VALUES (?1, ?2, ?3, ?4, '', '', ?5, ?6, ?7, 1)
            ",
            params![
                mod_id,
                game_id,
                import_summary.name,
                import_summary.mod_type,
                import_summary.source_dir,
                installed_at,
                import_summary.size_bytes
            ],
        )
        .map_err(|error| format!("failed to insert mod entry: {error}"))?;

    for file in import_summary.files {
        connection
            .execute(
                "
                INSERT INTO files (mod_id, source_path, target_path, target_folder)
                VALUES (?1, ?2, ?3, ?4)
                ",
                params![mod_id, file.source_path, file.target_path, file.target_folder],
            )
            .map_err(|error| format!("failed to insert mod file entry: {error}"))?;
    }

    Ok(())
}

pub(crate) fn build_mod_import_preview(
    database_path: &Path,
    game_id: &str,
    mod_dir: &Path,
    mod_name_override: Option<&str>,
) -> Result<ModImportPreviewPayload, String> {
    let import_summary = scan_imported_mod_directory(mod_dir, mod_name_override)?;
    if import_summary.files.is_empty() {
        return Err("选择的 Mod 文件夹里没有可导入的文件".to_string());
    }

    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let conflict_files = load_preview_conflict_files(&connection, game_id, &import_summary.files)?;
    let target_folders = import_summary
        .files
        .iter()
        .map(|file| file.target_folder.clone())
        .filter(|folder| !folder.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let preview_files = import_summary
        .files
        .iter()
        .map(|file| file.target_path.clone())
        .take(5)
        .collect::<Vec<_>>();
    let files = import_summary
        .files
        .iter()
        .map(|file| ModImportFileEntryPayload {
            relative_path: file.relative_path.clone(),
            target_path: file.target_path.clone(),
            target_folder: file.target_folder.clone(),
        })
        .collect::<Vec<_>>();
    let conflict_with = conflict_files
        .iter()
        .map(|conflict| conflict.other_mod_name.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    Ok(ModImportPreviewPayload {
        name: import_summary.name,
        mod_type: import_summary.mod_type,
        file_count: import_summary.file_count,
        size_bytes: import_summary.size_bytes,
        source_dir: import_summary.source_dir,
        has_g2m_manifest: import_summary.has_g2m_manifest,
        g2m_manifest_path: import_summary.g2m_manifest_path,
        target_folders,
        preview_files,
        files,
        conflict_files,
        conflict_with,
    })
}

pub(crate) fn build_mod_source_preview(
    mod_dir: &Path,
    mod_name_override: Option<&str>,
) -> Result<ModImportPreviewPayload, String> {
    let import_summary = scan_imported_mod_directory(mod_dir, mod_name_override)?;
    if import_summary.files.is_empty() {
        return Err("选择的 Mod 文件夹里没有可导出的文件".to_string());
    }

    let target_folders = import_summary
        .files
        .iter()
        .map(|file| file.target_folder.clone())
        .filter(|folder| !folder.is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let preview_files = import_summary
        .files
        .iter()
        .map(|file| file.target_path.clone())
        .take(5)
        .collect::<Vec<_>>();
    let files = import_summary
        .files
        .iter()
        .map(|file| ModImportFileEntryPayload {
            relative_path: file.relative_path.clone(),
            target_path: file.target_path.clone(),
            target_folder: file.target_folder.clone(),
        })
        .collect::<Vec<_>>();

    Ok(ModImportPreviewPayload {
        name: import_summary.name,
        mod_type: import_summary.mod_type,
        file_count: import_summary.file_count,
        size_bytes: import_summary.size_bytes,
        source_dir: import_summary.source_dir,
        has_g2m_manifest: import_summary.has_g2m_manifest,
        g2m_manifest_path: import_summary.g2m_manifest_path,
        target_folders,
        preview_files,
        files,
        conflict_files: Vec::<StoredConflictFile>::new(),
        conflict_with: Vec::new(),
    })
}

fn scan_imported_mod_directory(
    mod_dir: &Path,
    mod_name_override: Option<&str>,
) -> Result<ImportedModSummary, String> {
    let mod_name = mod_name_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            mod_dir
                .file_name()
                .and_then(|value| value.to_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .ok_or_else(|| "无法识别 Mod 名称".to_string())?;
    let mut files = Vec::new();
    let mut total_size = 0_i64;
    let mut has_modloader = false;
    let mut has_cleo = false;
    let mut has_asi = false;
    let g2m_manifest_path = mod_dir.join("g2m.json");
    let has_g2m_manifest = g2m_manifest_path.is_file();

    collect_imported_mod_files(
        mod_dir,
        mod_dir,
        &mut files,
        &mut total_size,
        &mut has_modloader,
        &mut has_cleo,
        &mut has_asi,
    )?;

    Ok(ImportedModSummary {
        name: mod_name,
        mod_type: infer_mod_type(has_modloader, has_cleo, has_asi).to_string(),
        file_count: files.len() as i64,
        size_bytes: total_size,
        source_dir: mod_dir.to_string_lossy().to_string(),
        has_g2m_manifest,
        g2m_manifest_path: has_g2m_manifest.then(|| g2m_manifest_path.to_string_lossy().to_string()),
        files,
    })
}

#[allow(clippy::too_many_arguments)]
fn collect_imported_mod_files(
    base_dir: &Path,
    current_dir: &Path,
    files: &mut Vec<ImportedModFile>,
    total_size: &mut i64,
    has_modloader: &mut bool,
    has_cleo: &mut bool,
    has_asi: &mut bool,
) -> Result<(), String> {
    for entry in fs::read_dir(current_dir)
        .map_err(|error| format!("failed to read mod directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read directory entry: {error}"))?;
        let path = entry.path();

        if path.is_dir() {
            collect_imported_mod_files(
                base_dir,
                &path,
                files,
                total_size,
                has_modloader,
                has_cleo,
                has_asi,
            )?;
            continue;
        }

        if !path.is_file() {
            continue;
        }

        let relative_path = path
            .strip_prefix(base_dir)
            .map_err(|error| format!("failed to build relative mod path: {error}"))?;
        let normalized_relative = normalize_path(relative_path);
        if normalized_relative.eq_ignore_ascii_case("g2m.json") {
            continue;
        }

        let (target_path, target_folder) = infer_target_path(relative_path);

        match target_folder.as_str() {
            "modloader" => *has_modloader = true,
            "cleo" => *has_cleo = true,
            "plugins" => *has_asi = true,
            _ => {}
        }

        let file_size = fs::metadata(&path)
            .map_err(|error| format!("failed to read file metadata: {error}"))?
            .len() as i64;
        *total_size += file_size;

        files.push(ImportedModFile {
            relative_path: normalized_relative,
            source_path: path.to_string_lossy().to_string(),
            target_path,
            target_folder,
        });
    }

    Ok(())
}

fn infer_target_path(relative_path: &Path) -> (String, String) {
    let normalized_relative = normalize_path(relative_path);
    let file_name = relative_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("unknown");
    let file_name_normalized = file_name.replace('\\', "/");
    let lower_relative = normalized_relative.to_lowercase();
    let lower_file_name = file_name_normalized.to_lowercase();

    if lower_relative.starts_with("modloader/") {
        return (normalized_relative, "modloader".to_string());
    }
    if lower_relative.starts_with("cleo/") {
        return (normalized_relative, "cleo".to_string());
    }
    if lower_relative.starts_with("plugins/") {
        return (normalized_relative, "plugins".to_string());
    }

    if lower_file_name.ends_with(".cs")
        || lower_file_name.ends_with(".cleo")
        || lower_file_name.ends_with(".csa")
    {
        return (format!("cleo/{file_name_normalized}"), "cleo".to_string());
    }
    if lower_file_name.ends_with(".asi")
        || lower_file_name.ends_with(".dll")
        || lower_file_name.ends_with(".ini")
    {
        return (format!("plugins/{file_name_normalized}"), "plugins".to_string());
    }

    (
        format!("modloader/{normalized_relative}"),
        "modloader".to_string(),
    )
}

fn apply_import_file_overrides(
    files: &mut [ImportedModFile],
    file_overrides: Option<&[ImportFileOverride]>,
) -> Result<(), String> {
    let Some(file_overrides) = file_overrides else {
        return Ok(());
    };

    if file_overrides.is_empty() {
        return Ok(());
    }

    let overrides = file_overrides
        .iter()
        .map(|file| {
            Ok::<(String, String), String>((
                file.relative_path.trim().replace('\\', "/"),
                normalize_target_path(&file.target_path)?,
            ))
        })
        .collect::<Result<HashMap<_, _>, String>>()?;
    let mut applied = BTreeSet::new();

    for file in files.iter_mut() {
        if let Some(target_path) = overrides.get(&file.relative_path) {
            file.target_path = target_path.clone();
            file.target_folder = infer_target_folder_from_target_path(target_path);
            applied.insert(file.relative_path.clone());
        }
    }

    let unknown_files = overrides
        .keys()
        .filter(|relative_path| !applied.contains(*relative_path))
        .cloned()
        .collect::<Vec<_>>();
    if !unknown_files.is_empty() {
        return Err(format!(
            "存在无法匹配的导入文件映射: {}",
            unknown_files.join(", ")
        ));
    }

    Ok(())
}

fn normalize_target_path(target_path: &str) -> Result<String, String> {
    let normalized = target_path
        .trim()
        .replace('\\', "/")
        .trim_matches('/')
        .to_string();

    if normalized.is_empty() {
        return Err("目标安装路径不能为空".to_string());
    }

    Ok(normalized)
}

fn infer_target_folder_from_target_path(target_path: &str) -> String {
    target_path
        .split('/')
        .find(|segment| !segment.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn infer_mod_type(has_modloader: bool, has_cleo: bool, has_asi: bool) -> &'static str {
    let type_count = [has_modloader, has_cleo, has_asi]
        .into_iter()
        .filter(|value| *value)
        .count();

    if type_count > 1 {
        return "Mixed";
    }
    if has_modloader {
        return "ModLoader";
    }
    if has_cleo {
        return "CLEO";
    }
    if has_asi {
        return "ASI";
    }

    "Mixed"
}

fn extract_zip_archive(archive_path: &Path, target_dir: &Path) -> Result<(), String> {
    let archive_file = File::open(archive_path)
        .map_err(|error| format!("failed to open mod archive: {error}"))?;
    let mut archive = zip::ZipArchive::new(archive_file)
        .map_err(|error| format!("failed to read mod archive: {error}"))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("failed to read archive entry: {error}"))?;
        let Some(enclosed_name) = entry.enclosed_name().map(Path::to_path_buf) else {
            continue;
        };
        let target_path = target_dir.join(enclosed_name);

        if entry.is_dir() {
            fs::create_dir_all(&target_path)
                .map_err(|error| format!("failed to create archive directory: {error}"))?;
            continue;
        }

        if let Some(parent_dir) = target_path.parent() {
            fs::create_dir_all(parent_dir)
                .map_err(|error| format!("failed to prepare extracted file path: {error}"))?;
        }

        let mut output_file = File::create(&target_path)
            .map_err(|error| format!("failed to create extracted file: {error}"))?;
        io::copy(&mut entry, &mut output_file)
            .map_err(|error| format!("failed to extract archive entry: {error}"))?;
    }

    Ok(())
}

fn detect_import_root(extraction_root: &Path) -> Result<PathBuf, String> {
    let mut child_directories = Vec::new();
    let mut child_files = 0;

    for entry in fs::read_dir(extraction_root)
        .map_err(|error| format!("failed to inspect extracted archive: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read extracted entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            child_directories.push(path);
        } else if path.is_file() {
            child_files += 1;
        }
    }

    if child_files == 0 && child_directories.len() == 1 {
        return Ok(child_directories.remove(0));
    }

    Ok(extraction_root.to_path_buf())
}

pub(crate) fn copy_directory_recursive(source_dir: &Path, target_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(target_dir)
        .map_err(|error| format!("failed to create import directory: {error}"))?;

    for entry in fs::read_dir(source_dir)
        .map_err(|error| format!("failed to read source mod directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read source entry: {error}"))?;
        let source_path = entry.path();
        let target_path = target_dir.join(entry.file_name());

        if source_path.is_dir() {
            copy_directory_recursive(&source_path, &target_path)?;
        } else if source_path.is_file() {
            fs::copy(&source_path, &target_path)
                .map_err(|error| format!("failed to copy mod file: {error}"))?;
        }
    }

    Ok(())
}

pub(crate) fn unique_directory_path(parent_dir: &Path, base_name: &str) -> PathBuf {
    let sanitized = sanitize_folder_name(base_name);
    let mut candidate = parent_dir.join(&sanitized);
    let mut index = 2;

    while candidate.exists() {
        candidate = parent_dir.join(format!("{sanitized}-{index}"));
        index += 1;
    }

    candidate
}

fn sanitize_folder_name(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => character,
        })
        .collect::<String>()
        .trim()
        .to_string();

    if sanitized.is_empty() {
        "imported-mod".to_string()
    } else {
        sanitized
    }
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
