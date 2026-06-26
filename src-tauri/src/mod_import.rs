use rusqlite::{params, Connection};
use serde::Deserialize;
use std::{
    collections::{BTreeSet, HashMap, HashSet},
    fs::{self, File},
    io,
    path::{Path, PathBuf},
};

use crate::{
    build_game_scoped_storage_path, build_mod_id, current_timestamp, load_preview_conflict_files,
    load_stored_game_by_id, random_suffix, ExistingBuilderManifestFilePayload,
    ExistingBuilderManifestLinkPayload, ExistingBuilderManifestPayload,
    ExistingBuilderManifestUpdatePayload, ManifestSourceDigestPayload, ModImportFileEntryPayload,
    ModImportPreviewPayload, StoredConflictFile, StoredGameEntry,
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
    pub(crate) skip_install: bool,
    pub(crate) overwrite_existing: bool,
}

#[derive(Debug)]
struct ImportedModSummary {
    name: String,
    version: String,
    author: String,
    mod_type: String,
    file_count: i64,
    size_bytes: i64,
    source_dir: String,
    has_g2m_manifest: bool,
    g2m_manifest_path: Option<String>,
    existing_manifest: Option<ExistingBuilderManifestPayload>,
    files: Vec<ImportedModFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExistingBuilderManifestFileInput {
    path: String,
    install_to: String,
    #[serde(default)]
    games: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct ExistingBuilderManifestInput {
    #[serde(default)]
    name: String,
    #[serde(default)]
    version: String,
    #[serde(default)]
    author: String,
    #[serde(rename = "type", default)]
    mod_type: String,
    #[serde(default)]
    gtamodx_url: String,
    #[serde(default)]
    github_url: String,
    #[serde(default)]
    links: Vec<ExistingBuilderManifestLinkInput>,
    #[serde(default)]
    prerequisites: Vec<String>,
    #[serde(default)]
    custom_prerequisites: Vec<ExistingBuilderManifestCustomPrerequisiteInput>,
    #[serde(default)]
    update: Option<ExistingBuilderManifestUpdateInput>,
    #[serde(default)]
    files: Vec<ExistingBuilderManifestFileInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExistingBuilderManifestCustomPrerequisiteInput {
    #[serde(default)]
    name: String,
    #[serde(default)]
    url: String,
}

#[derive(Debug, Deserialize)]
struct ExistingBuilderManifestLinkInput {
    #[serde(default)]
    kind: String,
    #[serde(default)]
    label: String,
    #[serde(default)]
    url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExistingBuilderManifestUpdateInput {
    #[serde(default)]
    md5: String,
    #[serde(default)]
    md5_mode: String,
}

#[derive(Debug)]
pub(crate) struct PreparedImportSource {
    pub(crate) source_dir: PathBuf,
    pub(crate) display_name: String,
    pub(crate) original_is_zip: bool,
    pub(crate) original_zip_path: Option<PathBuf>,
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
            original_is_zip: false,
            original_zip_path: None,
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
        original_is_zip: true,
        original_zip_path: Some(source_path),
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

pub(crate) fn inspect_mod_source_digest_payload(
    source_path: &str,
    source_type: &str,
) -> Result<ManifestSourceDigestPayload, String> {
    let normalized_path = source_path.trim();
    if normalized_path.is_empty() {
        return Err("source path is empty".to_string());
    }

    let path = Path::new(normalized_path);
    if !path.exists() {
        return Err("source path does not exist".to_string());
    }

    match source_type.trim() {
        "directory" => Ok(ManifestSourceDigestPayload {
            md5: compute_directory_digest(path)?,
            md5_mode: "directory".to_string(),
        }),
        "zip" => Ok(ManifestSourceDigestPayload {
            md5: compute_file_digest(path)?,
            md5_mode: "archive".to_string(),
        }),
        other => Err(format!("unsupported source type: {other}")),
    }
}

pub(crate) fn import_mod_into_database(
    database_path: &Path,
    game_id: &str,
    game_type: &str,
    game_path: &Path,
    prepared_source: &PreparedImportSource,
    mod_name_override: Option<&str>,
    file_overrides: Option<&[ImportFileOverride]>,
) -> Result<String, String> {
    let mut import_summary =
        scan_imported_mod_directory(
            &prepared_source.source_dir,
            mod_name_override,
            Some(game_type),
            prepared_source.original_is_zip,
            prepared_source.original_zip_path.as_deref()
        )?;
    apply_import_file_overrides(&mut import_summary.files, file_overrides)?;
    wrap_modloader_targets(&mut import_summary.files, &import_summary.name);

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
                id, game_id, name, version, mod_type, author, description, source_dir, installed_at, size_bytes, enabled
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, '', ?7, ?8, ?9, 1)
            ",
            params![
                mod_id,
                game_id,
                import_summary.name,
                import_summary.version,
                import_summary.mod_type,
                import_summary.author,
                build_game_scoped_storage_path(game_path, Path::new(&import_summary.source_dir)),
                installed_at,
                import_summary.size_bytes
            ],
        )
        .map_err(|error| format!("failed to insert mod entry: {error}"))?;

    for file in import_summary.files {
        let stored_source_path = build_game_scoped_storage_path(game_path, Path::new(&file.source_path));
        connection
            .execute(
                "
                INSERT INTO files (mod_id, source_path, target_path, target_folder)
                VALUES (?1, ?2, ?3, ?4)
                ",
                params![mod_id, stored_source_path, file.target_path, file.target_folder],
            )
            .map_err(|error| format!("failed to insert mod file entry: {error}"))?;
    }

    Ok(mod_id)
}

pub(crate) fn build_mod_import_preview(
    database_path: &Path,
    game_id: &str,
    game_type: &str,
    prepared_source: &PreparedImportSource,
    mod_name_override: Option<&str>,
) -> Result<ModImportPreviewPayload, String> {
    let import_summary = scan_imported_mod_directory(
        &prepared_source.source_dir,
        mod_name_override,
        Some(game_type),
        prepared_source.original_is_zip,
        prepared_source.original_zip_path.as_deref()
    )?;
    if import_summary.files.is_empty() {
        return Err("选择的 Mod 文件夹里没有可导入的文件".to_string());
    }

    let connection = Connection::open(database_path)
        .map_err(|error| format!("failed to open database: {error}"))?;
    let game = load_stored_game_by_id(database_path, game_id)?
        .ok_or_else(|| "未找到当前目标游戏".to_string())?;
    let mut conflict_files = load_preview_conflict_files(&connection, game_id, &import_summary.files)?;
    append_existing_target_conflicts(Path::new(&game.path), &import_summary.files, &mut conflict_files)?;
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
        existing_manifest: import_summary.existing_manifest.clone(),
        conflict_files,
        conflict_with,
    })
}

pub(crate) fn build_mod_source_preview(
    prepared_source: &PreparedImportSource,
    mod_name_override: Option<&str>,
) -> Result<ModImportPreviewPayload, String> {
    let import_summary = scan_imported_mod_directory(
        &prepared_source.source_dir,
        mod_name_override,
        None,
        prepared_source.original_is_zip,
        prepared_source.original_zip_path.as_deref()
    )?;
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
        existing_manifest: import_summary.existing_manifest.clone(),
        conflict_files: Vec::<StoredConflictFile>::new(),
        conflict_with: Vec::new(),
    })
}

pub(crate) fn build_mod_archive(
    source_path: &Path,
    source_type: &str,
    manifest_content: &str,
    output_path: &Path,
) -> Result<String, String> {
    if !source_path.exists() {
        return Err("Source path does not exist".to_string());
    }

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    let output_file = File::create(output_path)
        .map_err(|e| format!("Failed to create output archive: {}", e))?;
    let mut zip = zip::ZipWriter::new(output_file);
    let options = zip::write::FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 1. Add g2m.json at the root
    zip.start_file("g2m.json", options)
        .map_err(|e| format!("Failed to start g2m.json in archive: {}", e))?;
    use std::io::Write;
    zip.write_all(manifest_content.as_bytes())
        .map_err(|e| format!("Failed to write g2m.json: {}", e))?;

    // 2. Add source files
    if source_type == "directory" {
        add_directory_to_zip(&mut zip, source_path, source_path, options.clone())?;
    } else if source_type == "zip" {
        // If source is a ZIP, we need to extract it to a temp dir and then zip it
        let extraction_parent = std::env::temp_dir().join(format!("g2m-repack-{}", random_suffix()));
        fs::create_dir_all(&extraction_parent)
            .map_err(|e| format!("Failed to create temp dir: {}", e))?;
        
        let extract_res = extract_zip_archive(source_path, &extraction_parent);
        if let Err(e) = extract_res {
            let _ = fs::remove_dir_all(&extraction_parent);
            return Err(e);
        }

        let effective_root = detect_import_root(&extraction_parent)
            .unwrap_or_else(|_| extraction_parent.clone());

        let add_res = add_directory_to_zip(&mut zip, &effective_root, &effective_root, options.clone());
        let _ = fs::remove_dir_all(&extraction_parent);
        add_res?;
    } else {
        return Err(format!("Unsupported source type: {}", source_type));
    }

    zip.finish().map_err(|e| format!("Failed to finish zip: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

fn add_directory_to_zip<W: std::io::Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    base_dir: &Path,
    current_dir: &Path,
    options: zip::write::FileOptions,
) -> Result<(), String> {
    for entry in fs::read_dir(current_dir).map_err(|e| format!("Failed to read dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            add_directory_to_zip(zip, base_dir, &path, options.clone())?;
        } else if path.is_file() {
            let relative_path = path.strip_prefix(base_dir)
                .map_err(|e| format!("Failed to get relative path: {}", e))?
                .to_string_lossy()
                .replace('\\', "/");

            if relative_path.eq_ignore_ascii_case("g2m.json") {
                continue; // We already added the new g2m.json
            }

            zip.start_file(relative_path, options.clone())
                .map_err(|e| format!("Failed to start file in zip: {}", e))?;
            let mut f = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
            std::io::copy(&mut f, zip).map_err(|e| format!("Failed to write file to zip: {}", e))?;
        }
    }
    Ok(())
}

fn scan_imported_mod_directory(
    mod_dir: &Path,
    mod_name_override: Option<&str>,
    game_type: Option<&str>,
    _original_source_is_zip: bool,
    _original_source_zip_path: Option<&Path>,
) -> Result<ImportedModSummary, String> {
    let mut files = Vec::new();
    let mut total_size = 0_i64;
    let mut has_modloader = false;
    let mut has_cleo = false;
    let mut has_asi = false;
    let g2m_manifest_path = mod_dir.join("g2m.json");
    let has_g2m_manifest = g2m_manifest_path.is_file();

    let mut existing_manifest: Option<ExistingBuilderManifestPayload> = None;

    // 1. If it's a zip, try to fetch online manifest using its MD5 first
    // TODO: GTAMODX fetch logic using zip_md5 when available
    // let mut fetched_online = false;
    // if original_source_is_zip {
    //     if let Some(zip_path) = original_source_zip_path {
    //         let zip_md5 = compute_file_digest(zip_path)?;
    //         if let Ok(Some(online_manifest)) = fetch_gtamodx_manifest(&zip_md5) {
    //             existing_manifest = Some(online_manifest);
    //             fetched_online = true;
    //         }
    //     }
    // }

    // 2. If no online manifest, fallback to local g2m.json (if original was zip, it extracted here; if original was folder, it's just here)
    if existing_manifest.is_none() {
        existing_manifest = read_existing_builder_manifest(&g2m_manifest_path)?;
    }

    collect_imported_mod_files(
        mod_dir,
        mod_dir,
        &mut files,
        &mut total_size,
        &mut has_modloader,
        &mut has_cleo,
        &mut has_asi,
    )?;

    if let Some(manifest) = existing_manifest.as_ref() {
        apply_existing_manifest_mappings(&mut files, manifest, game_type);
    }

    files.retain(|file| !file.target_path.trim().is_empty());

    let mod_name = existing_manifest
        .as_ref()
        .map(|manifest| manifest.name.trim())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or_else(|| {
            mod_name_override
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .or_else(|| {
            mod_dir
                .file_name()
                .and_then(|value| value.to_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
        })
        .ok_or_else(|| "无法识别 Mod 名称".to_string())?;

    wrap_modloader_targets(&mut files, &mod_name);

    let mod_type = existing_manifest
        .as_ref()
        .map(|manifest| manifest.mod_type.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| infer_mod_type(has_modloader, has_cleo, has_asi))
        .to_string();
    let author = existing_manifest
        .as_ref()
        .map(|manifest| manifest.author.trim().to_string())
        .unwrap_or_default();
    let version = existing_manifest
        .as_ref()
        .map(|manifest| manifest.version.trim().to_string())
        .unwrap_or_default();

    Ok(ImportedModSummary {
        name: mod_name,
        version,
        author,
        mod_type,
        file_count: files.len() as i64,
        size_bytes: total_size,
        source_dir: mod_dir.to_string_lossy().to_string(),
        has_g2m_manifest,
        g2m_manifest_path: has_g2m_manifest.then(|| g2m_manifest_path.to_string_lossy().to_string()),
        existing_manifest,
        files,
    })
}

fn read_existing_builder_manifest(
    manifest_path: &Path,
) -> Result<Option<ExistingBuilderManifestPayload>, String> {
    if !manifest_path.is_file() {
        return Ok(None);
    }

    let content = fs::read_to_string(manifest_path)
        .map_err(|error| format!("failed to read g2m.json: {error}"))?;
    parse_builder_manifest_content(&content)
}

fn parse_builder_manifest_content(content: &str) -> Result<Option<ExistingBuilderManifestPayload>, String> {
    let parsed = serde_json::from_str::<ExistingBuilderManifestInput>(content)
        .map_err(|error| format!("failed to parse g2m.json: {error}"))?;
    let links = build_manifest_links_payload(&parsed);

    Ok(Some(ExistingBuilderManifestPayload {
        name: parsed.name.trim().to_string(),
        version: parsed.version.trim().to_string(),
        author: parsed.author.trim().to_string(),
        mod_type: parsed.mod_type.trim().to_string(),
        links,
        prerequisites: parsed.prerequisites,
        custom_prerequisites: parsed
            .custom_prerequisites
            .into_iter()
            .map(|cp| crate::ExistingBuilderManifestCustomPrerequisitePayload {
                name: cp.name.trim().to_string(),
                url: cp.url.trim().to_string(),
            })
            .collect(),
        update: parsed.update.map(|update| ExistingBuilderManifestUpdatePayload {
            md5: update.md5.trim().to_string(),
            md5_mode: update.md5_mode.trim().to_string(),
        }),
        files: parsed
            .files
            .into_iter()
            .map(|file| ExistingBuilderManifestFilePayload {
                path: file.path.trim().replace('\\', "/").trim_matches('/').to_string(),
                install_to: file
                    .install_to
                    .trim()
                    .replace('\\', "/")
                    .trim_matches('/')
                    .to_string(),
                games: file
                    .games
                    .into_iter()
                    .map(|game| game.trim().to_lowercase())
                    .filter(|game| !game.is_empty())
                    .collect(),
            })
            .collect(),
    }))
}

fn build_manifest_links_payload(
    parsed: &ExistingBuilderManifestInput,
) -> Vec<ExistingBuilderManifestLinkPayload> {
    let mut links = Vec::new();

    if !parsed.gtamodx_url.trim().is_empty() {
        links.push(ExistingBuilderManifestLinkPayload {
            kind: "gtamodx".to_string(),
            label: "GTAMODX".to_string(),
            url: parsed.gtamodx_url.trim().to_string(),
        });
    }

    if !parsed.github_url.trim().is_empty() {
        links.push(ExistingBuilderManifestLinkPayload {
            kind: "github".to_string(),
            label: "GitHub".to_string(),
            url: parsed.github_url.trim().to_string(),
        });
    }

    links.extend(
        parsed
            .links
            .iter()
            .map(|link| ExistingBuilderManifestLinkPayload {
                kind: link.kind.trim().to_string(),
                label: link.label.trim().to_string(),
                url: link.url.trim().to_string(),
            })
            .filter(|link| !link.label.is_empty() || !link.url.is_empty()),
    );

    dedupe_manifest_links(links)
}

fn dedupe_manifest_links(
    links: Vec<ExistingBuilderManifestLinkPayload>,
) -> Vec<ExistingBuilderManifestLinkPayload> {
    let mut results = Vec::new();
    let mut seen_kinds = HashSet::new();

    for link in links {
        let kind = link.kind.trim().to_lowercase();
        if (kind == "gtamodx" || kind == "github") && !seen_kinds.insert(kind) {
            continue;
        }
        results.push(link);
    }

    results
}

fn apply_existing_manifest_mappings(
    files: &mut [ImportedModFile],
    manifest: &ExistingBuilderManifestPayload,
    game_type: Option<&str>,
) {
    let mut manifest_entries = manifest
        .files
        .iter()
        .map(|entry| {
            (
                normalize_target_path(&entry.path).unwrap_or_default(),
                normalize_target_path(&entry.install_to).unwrap_or_default(),
                entry.games.clone(),
            )
        })
        .filter(|(path, _, _)| !path.is_empty())
        .collect::<Vec<_>>();

    manifest_entries.sort_by(|left, right| right.0.len().cmp(&left.0.len()));

    for file in files.iter_mut() {
        let normalized_relative_path = file.relative_path.trim().replace('\\', "/");

        if let Some((_, install_to, games)) = manifest_entries
            .iter()
            .find(|(path, _, _)| path == &normalized_relative_path)
        {
            if !manifest_entry_applies_to_game(games, game_type) {
                file.target_path.clear();
                file.target_folder.clear();
                continue;
            }
            file.target_path = install_to.clone();
            file.target_folder = infer_target_folder_from_target_path(install_to);
            continue;
        }

        if let Some((path, install_to, games)) = manifest_entries
            .iter()
            .find(|(path, _, _)| normalized_relative_path.starts_with(&format!("{path}/")))
        {
            if !manifest_entry_applies_to_game(games, game_type) {
                file.target_path.clear();
                file.target_folder.clear();
                continue;
            }
            let suffix = normalized_relative_path
                .strip_prefix(path)
                .unwrap_or_default()
                .trim_start_matches('/');
            let target_path = join_folder_target_path(install_to, path, suffix);
            file.target_path = target_path.clone();
            file.target_folder = infer_target_folder_from_target_path(&target_path);
        }
    }
}

fn manifest_entry_applies_to_game(games: &[String], game_type: Option<&str>) -> bool {
    if games.is_empty() {
        return true;
    }

    let Some(game_type) = game_type else {
        return true;
    };

    games
        .iter()
        .any(|candidate| candidate.eq_ignore_ascii_case(game_type))
}

fn join_target_path(prefix: &str, suffix: &str) -> String {
    let normalized_prefix = normalize_target_path(prefix).unwrap_or_default();
    let normalized_suffix = normalize_target_path(suffix).unwrap_or_default();

    if normalized_prefix.is_empty() {
        return normalized_suffix;
    }
    if normalized_suffix.is_empty() {
        return normalized_prefix;
    }

    format!("{normalized_prefix}/{normalized_suffix}")
}

fn join_folder_target_path(install_to: &str, source_path: &str, suffix: &str) -> String {
    let normalized_source_path = normalize_target_path(source_path).unwrap_or_default();
    let source_folder_name = normalized_source_path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .last()
        .unwrap_or_default();
    let normalized_install_to = normalize_target_path(install_to).unwrap_or_default();

    let base_target_path = if !source_folder_name.is_empty()
        && normalized_install_to
            .split('/')
            .filter(|segment| !segment.is_empty())
            .last()
            == Some(source_folder_name)
    {
        normalized_install_to
    } else {
        join_target_path(&normalized_install_to, source_folder_name)
    };

    join_target_path(&base_target_path, suffix)
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
        || lower_file_name.ends_with(".js")
        || lower_file_name.ends_with(".ts")
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

    let mut overrides = HashMap::new();
    for file in file_overrides {
        let relative_path = file.relative_path.trim().replace('\\', "/");
        if file.skip_install {
            overrides.insert(relative_path, None);
            continue;
        }

        let target_path = normalize_target_path(&file.target_path)?;
        if target_path.is_empty() {
            continue;
        }
        overrides.insert(relative_path, Some(target_path));
    }
    let mut applied = BTreeSet::new();

    for file in files.iter_mut() {
        if let Some(target_path) = overrides.get(&file.relative_path) {
            if let Some(target_path) = target_path {
                file.target_path = target_path.clone();
                file.target_folder = infer_target_folder_from_target_path(target_path);
            } else {
                file.target_path.clear();
                file.target_folder.clear();
            }
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

fn append_existing_target_conflicts(
    game_path: &Path,
    imported_files: &[ImportedModFile],
    conflict_files: &mut Vec<StoredConflictFile>,
) -> Result<(), String> {
    let existing_targets = conflict_files
        .iter()
        .map(|conflict| conflict.target_path.clone())
        .collect::<HashSet<_>>();

    for imported_file in imported_files {
        if imported_file.target_path.trim().is_empty() {
            continue;
        }

        if existing_targets.contains(&imported_file.target_path) {
            continue;
        }

        let target_path = resolve_target_path(game_path, &imported_file.target_path);
        if !target_path.exists() {
            continue;
        }

        let file_name = Path::new(&imported_file.target_path)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("unknown")
            .to_string();

        conflict_files.push(StoredConflictFile {
            id: format!("existing-{}", random_suffix()),
            file_name,
            target_path: imported_file.target_path.clone(),
            source_path: imported_file.source_path.clone(),
            target_folder: imported_file.target_folder.clone(),
            other_mod_name: "当前游戏目录现有文件".to_string(),
            other_source_path: target_path.to_string_lossy().to_string(),
        });
    }

    Ok(())
}

fn resolve_target_path(game_path: &Path, target_path: &str) -> PathBuf {
    let mut resolved = game_path.to_path_buf();
    for segment in target_path.split('/').filter(|segment| !segment.is_empty()) {
        resolved.push(segment);
    }

    resolved
}

fn normalize_target_path(target_path: &str) -> Result<String, String> {
    Ok(target_path
        .trim()
        .replace('\\', "/")
        .trim_matches('/')
        .to_string())
}

fn wrap_modloader_targets(files: &mut [ImportedModFile], mod_name: &str) {
    let wrapper_dir = format!("[G2M] {}", mod_name.replace('/', "_").replace('\\', "_"));
    let wrapper_prefix = format!("modloader/{}/", wrapper_dir).to_lowercase();
    
    for file in files {
        if file.target_folder.eq_ignore_ascii_case("modloader") {
            let target_lower = file.target_path.to_lowercase();
            if target_lower.starts_with(&wrapper_prefix) {
                continue;
            }
            if target_lower.starts_with("modloader/") {
                let suffix = &file.target_path["modloader/".len()..];
                file.target_path = format!("modloader/{}/{}", wrapper_dir, suffix);
            } else if target_lower == "modloader" {
                file.target_path = format!("modloader/{}", wrapper_dir);
            }
        }
    }
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

pub(crate) fn copy_directory_recursive(
    source_dir: &Path,
    target_dir: &Path,
    game_type: Option<&str>,
) -> Result<(), String> {
    let manifest = read_existing_builder_manifest(&source_dir.join("g2m.json"))?;
    copy_directory_recursive_with_manifest(source_dir, source_dir, target_dir, manifest.as_ref(), game_type)?;
    Ok(())
}

fn copy_directory_recursive_with_manifest(
    base_dir: &Path,
    current_dir: &Path,
    target_dir: &Path,
    manifest: Option<&ExistingBuilderManifestPayload>,
    game_type: Option<&str>,
) -> Result<bool, String> {
    let mut copied_any = false;

    for entry in fs::read_dir(current_dir)
        .map_err(|error| format!("failed to read source mod directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read source entry: {error}"))?;
        let source_path = entry.path();
        let target_path = target_dir.join(entry.file_name());

        if source_path.is_dir() {
            let copied_child = copy_directory_recursive_with_manifest(
                base_dir,
                &source_path,
                &target_path,
                manifest,
                game_type,
            )?;
            copied_any |= copied_child;
            continue;
        }

        if !source_path.is_file() {
            continue;
        }

        let relative_path = source_path
            .strip_prefix(base_dir)
            .map_err(|error| format!("failed to build relative mod path for copy: {error}"))?;
        let normalized_relative = normalize_path(relative_path);
        if normalized_relative.eq_ignore_ascii_case("g2m.json") {
            continue;
        }

        if let Some(manifest) = manifest {
            if !manifest_allows_relative_path(manifest, &normalized_relative, game_type) {
                continue;
            }
        }

        if let Some(parent_dir) = target_path.parent() {
            fs::create_dir_all(parent_dir)
                .map_err(|error| format!("failed to create import directory: {error}"))?;
        }
        fs::copy(&source_path, &target_path)
            .map_err(|error| format!("failed to copy mod file: {error}"))?;
        copied_any = true;
    }

    Ok(copied_any)
}

fn manifest_allows_relative_path(
    manifest: &ExistingBuilderManifestPayload,
    relative_path: &str,
    game_type: Option<&str>,
) -> bool {
    let normalized_relative = relative_path.trim().replace('\\', "/");
    let mut manifest_entries = manifest
        .files
        .iter()
        .map(|entry| {
            (
                normalize_target_path(&entry.path).unwrap_or_default(),
                entry.games.as_slice(),
            )
        })
        .filter(|(path, _)| !path.is_empty())
        .collect::<Vec<_>>();
    manifest_entries.sort_by(|left, right| right.0.len().cmp(&left.0.len()));

    if let Some((_, games)) = manifest_entries
        .iter()
        .find(|(path, _)| normalized_relative == *path || normalized_relative.starts_with(&format!("{path}/")))
    {
        return manifest_entry_applies_to_game(games, game_type);
    }

    true
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

fn compute_file_digest(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("failed to read file for md5 {}: {error}", path.display()))?;
    Ok(format!("{:x}", md5::compute(bytes)))
}

fn compute_directory_digest(path: &Path) -> Result<String, String> {
    if !path.is_dir() {
        return Err("source directory is invalid".to_string());
    }

    let mut files = Vec::new();
    collect_digest_files(path, path, &mut files)?;
    files.sort_by(|left, right| left.0.cmp(&right.0));

    let mut context = md5::Context::new();
    for (relative_path, absolute_path) in files {
        context.consume(relative_path.as_bytes());
        context.consume(b"\0");

        let mut file =
            File::open(&absolute_path).map_err(|error| format!("failed to open source file: {error}"))?;
        let mut buffer = [0_u8; 8 * 1024];
        loop {
            let read_bytes = std::io::Read::read(&mut file, &mut buffer)
                .map_err(|error| format!("failed to read source file for md5: {error}"))?;
            if read_bytes == 0 {
                break;
            }
            context.consume(&buffer[..read_bytes]);
        }
        context.consume(b"\0");
    }

    Ok(format!("{:x}", context.finalize()))
}

fn collect_digest_files(
    base_dir: &Path,
    current_dir: &Path,
    files: &mut Vec<(String, PathBuf)>,
) -> Result<(), String> {
    for entry in fs::read_dir(current_dir)
        .map_err(|error| format!("failed to read digest directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read digest entry: {error}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_digest_files(base_dir, &path, files)?;
            continue;
        }
        if !path.is_file() {
            continue;
        }

        let relative_path = path
            .strip_prefix(base_dir)
            .map_err(|error| format!("failed to build digest relative path: {error}"))?
            .to_string_lossy()
            .replace('\\', "/");
        if relative_path.eq_ignore_ascii_case("g2m.json") {
            continue;
        }

        files.push((relative_path, path));
    }

    Ok(())
}
