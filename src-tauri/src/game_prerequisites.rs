use std::{
    fs,
    io,
    path::{Path, PathBuf},
};

use crate::{
    paths_equal,
    resolve_game_target_path,
    storage::{ensure_game_workspace, StoragePaths},
    symlink_install::{
        backup_existing_target, remove_path_if_exists, resolve_backup_target_path,
        restore_target_from_backup,
    },
    GameDirectory, GamePrerequisitePayload, ModInstallFileRecord, GAME_WORKSPACE_DIR_NAME,
};

const ROOT_SCOPE: &str = "root";
const SCRIPTS_PLUGINS_SCOPE: &str = "scriptsPlugins";
const PREREQUISITES_DIR_NAME: &str = "prerequisites";
const LEGACY_RUNTIME_ROOT_OWNER: &str = "__runtime_roots__";

struct PrerequisiteDefinition {
    key: &'static str,
    label: String,
    scan_scope: &'static str,
    required: bool,
    can_uninstall: bool,
    plan: PrerequisiteInstallPlan,
}

struct SilentPatchDefinition {
    label: String,
    core_plan: PrerequisiteInstallPlan,
    modloader_data_plan: PrerequisiteInstallPlan,
    direct_data_plan: PrerequisiteInstallPlan,
}

struct PrerequisiteInstallPlan {
    owner_id: String,
    storage_dir_name: String,
    source_archive_path: PathBuf,
    files: Vec<PrerequisiteFileMapping>,
}

struct PrerequisiteFileMapping {
    relative_source_path: String,
    target_path: String,
}

pub(crate) fn detect_game_prerequisites(paths: &StoragePaths, mut game: GameDirectory) -> GameDirectory {
    game.prerequisites = detect_game_prerequisite_payloads(paths, Path::new(&game.path), &game.game_type);
    game
}

pub(crate) fn detect_game_prerequisite_payloads(
    paths: &StoragePaths,
    game_path: &Path,
    game_type: &str,
) -> Vec<GamePrerequisitePayload> {
    detect_for_path(paths, game_path, game_type)
}

pub(crate) fn install_game_prerequisite(
    paths: &StoragePaths,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    let modules_dir = resolve_modules_dir(paths)?;
    install_named_prerequisite(&modules_dir, game_path, game_type, prerequisite_key)
}

pub(crate) fn uninstall_game_prerequisite(
    paths: &StoragePaths,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    let modules_dir = resolve_modules_dir(paths)?;
    uninstall_named_prerequisite(&modules_dir, game_path, game_type, prerequisite_key)
}

pub(crate) fn repair_game_prerequisites(
    paths: &StoragePaths,
    game_path: &Path,
    game_type: &str,
) -> Result<(), String> {
    let modules_dir = resolve_modules_dir(paths)?;
    for prerequisite_key in ["asiloader", "modloader"] {
        install_named_prerequisite(&modules_dir, game_path, game_type, prerequisite_key)?;
    }

    if should_repair_plan(game_path, &build_cleo_definition(&modules_dir, game_type)?.plan) {
        install_named_prerequisite(&modules_dir, game_path, game_type, "cleo")?;
    }

    if should_repair_plan(game_path, &build_cleo_redux_definition(&modules_dir)?.plan) {
        install_named_prerequisite(&modules_dir, game_path, game_type, "cleo_redux")?;
    }

    let silent_patch = build_silent_patch_definition(&modules_dir, game_type)?;
    if should_repair_plan(game_path, &silent_patch.core_plan)
        || should_repair_plan(game_path, &silent_patch.modloader_data_plan)
        || should_repair_plan(game_path, &silent_patch.direct_data_plan)
    {
        install_named_prerequisite(&modules_dir, game_path, game_type, "silentpatch")?;
    }

    if should_repair_plan(game_path, &build_d3d8to9_definition(&modules_dir)?.plan) {
        install_named_prerequisite(&modules_dir, game_path, game_type, "d3d8to9")?;
    }

    Ok(())
}

pub(crate) fn resolve_prerequisite_asi_conflict(
    paths: &StoragePaths,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    let normalized_key = prerequisite_key
        .trim()
        .trim_end_matches("_duplicate_asi")
        .to_ascii_lowercase();
    let Some((canonical_target, file_names)) =
        primary_asi_rule_for_key(&normalized_key, game_type)
    else {
        return Err(format!("不支持处理该前置组件的 ASI 冲突: {prerequisite_key}"));
    };

    let duplicate_paths = find_existing_primary_asi_paths(game_path, &canonical_target, &file_names);
    if duplicate_paths.len() <= 1 {
        return Ok(());
    }

    let canonical_path = resolve_game_target_path(game_path, &canonical_target);
    for path in duplicate_paths {
        if path == canonical_path {
            continue;
        }

        remove_path_if_exists(&path)?;
    }

    install_game_prerequisite(paths, game_path, game_type, &normalized_key)
}

fn detect_for_path(paths: &StoragePaths, game_path: &Path, game_type: &str) -> Vec<GamePrerequisitePayload> {
    resolve_modules_dir(paths)
        .ok()
        .and_then(|modules_dir| detect_definitions_from_modules(&modules_dir, game_path, game_type).ok())
        .unwrap_or_default()
}

fn detect_definitions_from_modules(
    modules_dir: &Path,
    game_path: &Path,
    game_type: &str,
) -> Result<Vec<GamePrerequisitePayload>, String> {
    let asiloader = build_asiloader_definition(modules_dir)?;
    let modloader = build_modloader_definition(modules_dir)?;
    let cleo = build_cleo_definition(modules_dir, game_type)?;
    let cleo_redux = build_cleo_redux_definition(modules_dir)?;
    let silent_patch = build_silent_patch_definition(modules_dir, game_type)?;
    let d3d8to9 = build_d3d8to9_definition(modules_dir)?;

    let mut payloads = vec![
        build_payload_from_definition(&asiloader, game_path),
        build_payload_from_primary_targets(&modloader, game_path, "scripts/modloader.asi", &["modloader.asi"]),
        build_payload_from_cleo_definition(&cleo, game_path, game_type),
        build_payload_from_primary_targets(
            &cleo_redux,
            game_path,
            "plugins/cleo_redux.asi",
            &["cleo_redux.asi"],
        ),
    ];
    payloads.push(build_payload_from_silent_patch(&silent_patch, game_path));
    payloads.push(build_payload_from_definition(&d3d8to9, game_path));
    payloads.extend(
        [
            build_duplicate_primary_asi_payload(
                "modloader",
                "ModLoader",
                SCRIPTS_PLUGINS_SCOPE,
                game_path,
                "scripts/modloader.asi",
                &["modloader.asi"],
            ),
            build_duplicate_primary_asi_payload(
                "cleo",
                "CLEO",
                SCRIPTS_PLUGINS_SCOPE,
                game_path,
                &cleo_canonical_asi_target(game_type),
                &cleo_asi_file_names(game_type),
            ),
            build_duplicate_primary_asi_payload(
                "cleo_redux",
                "CLEO Redux",
                SCRIPTS_PLUGINS_SCOPE,
                game_path,
                "plugins/cleo_redux.asi",
                &["cleo_redux.asi"],
            ),
            build_duplicate_primary_asi_payload(
                "silentpatch",
                silent_patch_label(game_type),
                SCRIPTS_PLUGINS_SCOPE,
                game_path,
                &format!("scripts/{}", silent_patch_file_name(game_type)),
                &[silent_patch_file_name(game_type)],
            ),
        ]
        .into_iter()
        .flatten(),
    );

    Ok(payloads)
}

fn install_named_prerequisite(
    modules_dir: &Path,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    match prerequisite_key.trim().to_ascii_lowercase().as_str() {
        "asiloader" => apply_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan),
        "modloader" => {
            apply_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan)?;
            apply_install_plan(game_path, &build_modloader_definition(modules_dir)?.plan)
        }
        "cleo" => {
            apply_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan)?;
            apply_install_plan(game_path, &build_cleo_definition(modules_dir, game_type)?.plan)
        }
        "cleo_redux" => {
            apply_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan)?;
            apply_install_plan(game_path, &build_cleo_redux_definition(modules_dir)?.plan)
        }
        "silentpatch" => {
            apply_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan)?;
            apply_install_plan(game_path, &build_modloader_definition(modules_dir)?.plan)?;

            let definition = build_silent_patch_definition(modules_dir, game_type)?;
            apply_install_plan(game_path, &definition.core_plan)?;
            apply_install_plan(game_path, &definition.modloader_data_plan)
        }
        "d3d8to9" => apply_install_plan(game_path, &build_d3d8to9_definition(modules_dir)?.plan),
        other => Err(format!("不支持安装该前置组件: {other}")),
    }
}

fn uninstall_named_prerequisite(
    modules_dir: &Path,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    match prerequisite_key.trim().to_ascii_lowercase().as_str() {
        "asiloader" => remove_install_plan(game_path, &build_asiloader_definition(modules_dir)?.plan),
        "modloader" => remove_install_plan(game_path, &build_modloader_definition(modules_dir)?.plan),
        "cleo" => remove_install_plan(game_path, &build_cleo_definition(modules_dir, game_type)?.plan),
        "cleo_redux" => remove_install_plan(game_path, &build_cleo_redux_definition(modules_dir)?.plan),
        "silentpatch" => {
            let definition = build_silent_patch_definition(modules_dir, game_type)?;
            remove_install_plan(game_path, &definition.modloader_data_plan)?;
            remove_install_plan(game_path, &definition.direct_data_plan)?;
            remove_install_plan(game_path, &definition.core_plan)
        }
        "d3d8to9" => remove_install_plan(game_path, &build_d3d8to9_definition(modules_dir)?.plan),
        other => Err(format!("不支持卸载该前置组件: {other}")),
    }
}

fn apply_install_plan(game_path: &Path, plan: &PrerequisiteInstallPlan) -> Result<(), String> {
    ensure_game_workspace(game_path)?;
    let workspace_source_dir = stage_workspace_source(game_path, plan)?;
    let install_files = build_install_records(&workspace_source_dir, &plan.files);
    cleanup_legacy_runtime_root_symlinks(game_path, &install_files)?;
    install_copy_targets(game_path, &plan.owner_id, &install_files)
}

fn remove_install_plan(game_path: &Path, plan: &PrerequisiteInstallPlan) -> Result<(), String> {
    let workspace_source_dir = resolve_workspace_source_dir(game_path, &plan.storage_dir_name);
    let install_files = build_install_records(&workspace_source_dir, &plan.files);
    cleanup_legacy_runtime_root_symlinks(game_path, &install_files)?;
    uninstall_copy_targets(game_path, &plan.owner_id, &install_files)
}

fn stage_workspace_source(game_path: &Path, plan: &PrerequisiteInstallPlan) -> Result<PathBuf, String> {
    let workspace_source_dir = resolve_workspace_source_dir(game_path, &plan.storage_dir_name);
    refresh_workspace_source(&plan.source_archive_path, &workspace_source_dir)?;
    Ok(workspace_source_dir)
}

fn resolve_workspace_source_dir(game_path: &Path, storage_dir_name: &str) -> PathBuf {
    game_path
        .join(GAME_WORKSPACE_DIR_NAME)
        .join(PREREQUISITES_DIR_NAME)
        .join(storage_dir_name)
}

fn build_install_records(
    workspace_source_dir: &Path,
    files: &[PrerequisiteFileMapping],
) -> Vec<ModInstallFileRecord> {
    files.iter()
        .map(|file| ModInstallFileRecord {
            source_path: workspace_source_dir
                .join(&file.relative_source_path)
                .to_string_lossy()
                .to_string(),
            target_path: file.target_path.clone(),
        })
        .collect()
}

fn install_copy_targets(
    game_path: &Path,
    owner_id: &str,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    for file in files {
        let source_path = Path::new(&file.source_path);
        if !source_path.is_file() {
            return Err(format!("未找到前置组件安装文件: {}", source_path.display()));
        }

        let target_path = resolve_game_target_path(game_path, &file.target_path);
        let backup_path = resolve_backup_target_path(game_path, owner_id, &file.target_path);

        match fs::symlink_metadata(&target_path) {
            Ok(_) => {
                if backup_path.exists() {
                    remove_path_if_exists(&target_path)?;
                } else {
                    backup_existing_target(&target_path, &backup_path, None)?;
                }
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => {
                return Err(format!(
                    "failed to inspect prerequisite copy target {}: {error}",
                    target_path.display()
                ));
            }
        }

        if let Some(parent_dir) = target_path.parent() {
            fs::create_dir_all(parent_dir)
                .map_err(|error| format!("failed to create prerequisite target directory: {error}"))?;
        }

        fs::copy(source_path, &target_path).map_err(|error| {
            format!(
                "failed to copy prerequisite file {} -> {}: {error}",
                source_path.display(),
                target_path.display()
            )
        })?;
    }

    Ok(())
}

fn uninstall_copy_targets(
    game_path: &Path,
    owner_id: &str,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    for file in files {
        let target_path = resolve_game_target_path(game_path, &file.target_path);
        let backup_path = resolve_backup_target_path(game_path, owner_id, &file.target_path);

        remove_path_if_exists(&target_path)?;
        restore_target_from_backup(&target_path, &backup_path)?;
    }

    Ok(())
}

fn cleanup_legacy_runtime_root_symlinks(
    game_path: &Path,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    let runtime_roots = files
        .iter()
        .filter_map(|file| {
            let normalized = file.target_path.replace('\\', "/").to_ascii_lowercase();
            if normalized == "scripts" || normalized.starts_with("scripts/") {
                return Some("scripts");
            }
            if normalized == "plugins" || normalized.starts_with("plugins/") {
                return Some("plugins");
            }

            None
        })
        .collect::<std::collections::BTreeSet<_>>();

    for root_name in runtime_roots {
        cleanup_legacy_runtime_root_symlink(game_path, root_name)?;
    }

    Ok(())
}

fn cleanup_legacy_runtime_root_symlink(game_path: &Path, root_name: &str) -> Result<(), String> {
    let target_path = resolve_game_target_path(game_path, root_name);
    let metadata = match fs::symlink_metadata(&target_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!(
                "failed to inspect prerequisite runtime root before migration: {error}"
            ));
        }
    };

    if !metadata.file_type().is_symlink() {
        return Ok(());
    }

    let current_target = resolve_existing_link_target(&target_path)?;
    let expected_target = game_path
        .join(GAME_WORKSPACE_DIR_NAME)
        .join("runtime")
        .join(root_name)
        .canonicalize()
        .unwrap_or_else(|_| {
            game_path
                .join(GAME_WORKSPACE_DIR_NAME)
                .join("runtime")
                .join(root_name)
        });
    if !paths_equal(&current_target, &expected_target) {
        return Ok(());
    }

    let backup_path = resolve_backup_target_path(game_path, LEGACY_RUNTIME_ROOT_OWNER, root_name);
    remove_path_if_exists(&target_path)?;
    restore_target_from_backup(&target_path, &backup_path)
}

fn resolve_existing_link_target(link_path: &Path) -> Result<PathBuf, String> {
    let target = fs::read_link(link_path)
        .map_err(|error| format!("failed to read prerequisite runtime root symlink target: {error}"))?;
    let resolved = if target.is_absolute() {
        target
    } else {
        link_path
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_default()
            .join(target)
    };

    Ok(resolved.canonicalize().unwrap_or(resolved))
}

fn build_payload_from_definition(
    definition: &PrerequisiteDefinition,
    game_path: &Path,
) -> GamePrerequisitePayload {
    let (detected, detected_path) = detect_install_plan(game_path, &definition.plan);

    GamePrerequisitePayload {
        key: definition.key.to_string(),
        label: definition.label.clone(),
        detected,
        can_install: true,
        can_uninstall: definition.can_uninstall,
        required: definition.required,
        scan_scope: definition.scan_scope.to_string(),
        detected_path,
    }
}

fn build_payload_from_primary_targets(
    definition: &PrerequisiteDefinition,
    game_path: &Path,
    canonical_target: &str,
    file_names: &[&str],
) -> GamePrerequisitePayload {
    let (detected, detected_path) =
        detect_primary_targets(game_path, &definition.plan, canonical_target, file_names)
            .unwrap_or((false, None));

    GamePrerequisitePayload {
        key: definition.key.to_string(),
        label: definition.label.clone(),
        detected,
        can_install: true,
        can_uninstall: definition.can_uninstall,
        required: definition.required,
        scan_scope: definition.scan_scope.to_string(),
        detected_path,
    }
}

fn build_duplicate_primary_asi_payload(
    key: &str,
    label: &str,
    scan_scope: &str,
    game_path: &Path,
    canonical_target: &str,
    file_names: &[&str],
) -> Option<GamePrerequisitePayload> {
    let duplicates = find_existing_primary_asi_paths(game_path, canonical_target, file_names);
    (duplicates.len() > 1).then(|| GamePrerequisitePayload {
        key: format!("{key}_duplicate_asi"),
        label: label.to_string(),
        detected: true,
        can_install: false,
        can_uninstall: false,
        required: false,
        scan_scope: scan_scope.to_string(),
        detected_path: Some(
            resolve_game_target_path(game_path, canonical_target)
                .to_string_lossy()
                .to_string(),
        ),
    })
}

fn build_payload_from_cleo_definition(
    definition: &PrerequisiteDefinition,
    game_path: &Path,
    game_type: &str,
) -> GamePrerequisitePayload {
    let (detected, detected_path) =
        detect_cleo_install_plan(game_path, &definition.plan, game_type).unwrap_or((false, None));

    GamePrerequisitePayload {
        key: definition.key.to_string(),
        label: definition.label.clone(),
        detected,
        can_install: true,
        can_uninstall: definition.can_uninstall,
        required: definition.required,
        scan_scope: definition.scan_scope.to_string(),
        detected_path,
    }
}

fn build_payload_from_silent_patch(
    definition: &SilentPatchDefinition,
    game_path: &Path,
) -> GamePrerequisitePayload {
    let (detected, detected_path) = detect_silent_patch_install_plan(game_path, &definition.core_plan)
        .unwrap_or((false, None));

    GamePrerequisitePayload {
        key: "silentpatch".to_string(),
        label: definition.label.clone(),
        detected,
        can_install: true,
        can_uninstall: true,
        required: false,
        scan_scope: SCRIPTS_PLUGINS_SCOPE.to_string(),
        detected_path,
    }
}

fn detect_install_plan(game_path: &Path, plan: &PrerequisiteInstallPlan) -> (bool, Option<String>) {
    let detected_path = plan
        .files
        .iter()
        .find(|file| is_primary_detection_file(&file.target_path))
        .or_else(|| plan.files.first())
        .map(|file| resolve_game_target_path(game_path, &file.target_path))
        .filter(|path| fs::symlink_metadata(path).is_ok())
        .map(|path| path.to_string_lossy().to_string());

    (detected_path.is_some(), detected_path)
}

fn detect_cleo_install_plan(
    game_path: &Path,
    plan: &PrerequisiteInstallPlan,
    game_type: &str,
) -> Result<(bool, Option<String>), String> {
    let has_cleo_asi_target = plan
        .files
        .iter()
        .any(|file| file.target_path.to_ascii_lowercase().ends_with(".asi"));
    if !has_cleo_asi_target {
        return Ok((false, None));
    }

    Ok(find_present_primary_asi_path(
        game_path,
        &cleo_canonical_asi_target(game_type),
        &cleo_asi_file_names(game_type),
    ))
}

fn detect_silent_patch_install_plan(
    game_path: &Path,
    core_plan: &PrerequisiteInstallPlan,
) -> Result<(bool, Option<String>), String> {
    let silent_patch_file_name = core_plan
        .files
        .iter()
        .find(|file| file.target_path.to_ascii_lowercase().ends_with(".asi"))
        .and_then(|file| Path::new(&file.target_path).file_name().map(|name| name.to_string_lossy().to_string()))
        .ok_or_else(|| "SilentPatch 主 ASI 目标不存在".to_string())?;

    detect_primary_targets(
        game_path,
        core_plan,
        &format!("scripts/{silent_patch_file_name}"),
        &[silent_patch_file_name.as_str()],
    )
}

fn detect_primary_targets(
    game_path: &Path,
    _plan: &PrerequisiteInstallPlan,
    canonical_target: &str,
    file_names: &[&str],
) -> Result<(bool, Option<String>), String> {
    Ok(find_present_primary_asi_path(
        game_path,
        canonical_target,
        file_names,
    ))
}

fn should_repair_plan(game_path: &Path, plan: &PrerequisiteInstallPlan) -> bool {
    detect_install_plan(game_path, plan).0 || resolve_workspace_source_dir(game_path, &plan.storage_dir_name).exists()
}

fn is_primary_detection_file(target_path: &str) -> bool {
    let lower = target_path.to_ascii_lowercase();
    lower.ends_with(".asi") || lower.ends_with(".dll")
}

fn find_present_primary_asi_path(
    game_path: &Path,
    canonical_target: &str,
    file_names: &[&str],
) -> (bool, Option<String>) {
    let detected_path = build_primary_asi_candidate_paths(game_path, canonical_target, file_names)
        .into_iter()
        .find(|path| fs::symlink_metadata(path).is_ok())
        .map(|path| path.to_string_lossy().to_string());

    (detected_path.is_some(), detected_path)
}

fn find_existing_primary_asi_paths(
    game_path: &Path,
    canonical_target: &str,
    file_names: &[&str],
) -> Vec<PathBuf> {
    build_primary_asi_candidate_paths(game_path, canonical_target, file_names)
        .into_iter()
        .filter(|path| fs::symlink_metadata(path).is_ok())
        .collect()
}

fn build_primary_asi_candidate_paths(
    game_path: &Path,
    canonical_target: &str,
    file_names: &[&str],
) -> Vec<PathBuf> {
    let mut seen = std::collections::HashSet::new();
    let mut candidates = Vec::new();

    let canonical_path = resolve_game_target_path(game_path, canonical_target);
    let canonical_key = canonical_path.to_string_lossy().replace('\\', "/").to_ascii_lowercase();
    if seen.insert(canonical_key) {
        candidates.push(canonical_path);
    }

    for folder in ["", "plugins", "scripts"] {
        for file_name in file_names {
            let relative_target_path = if folder.is_empty() {
                (*file_name).to_string()
            } else {
                format!("{folder}/{file_name}")
            };
            let candidate_path = resolve_game_target_path(game_path, &relative_target_path);
            let candidate_key = candidate_path
                .to_string_lossy()
                .replace('\\', "/")
                .to_ascii_lowercase();
            if seen.insert(candidate_key) {
                candidates.push(candidate_path);
            }
        }
    }

    candidates
}

fn refresh_workspace_source(source_archive_path: &Path, target_dir: &Path) -> Result<(), String> {
    remove_path_if_exists(target_dir)?;
    fs::create_dir_all(target_dir)
        .map_err(|error| format!("failed to create prerequisite workspace directory: {error}"))?;
    extract_archive_contents(source_archive_path, target_dir)
}

fn extract_archive_contents(source_archive_path: &Path, target_dir: &Path) -> Result<(), String> {
    let archive_file = fs::File::open(source_archive_path).map_err(|error| {
        format!(
            "failed to open prerequisite archive {}: {error}",
            source_archive_path.display()
        )
    })?;
    let mut archive = zip::ZipArchive::new(archive_file).map_err(|error| {
        format!(
            "failed to read prerequisite archive {}: {error}",
            source_archive_path.display()
        )
    })?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| {
            format!(
                "failed to read prerequisite archive entry from {}: {error}",
                source_archive_path.display()
            )
        })?;
        let Some(relative_path) = entry.enclosed_name().map(Path::to_path_buf) else {
            continue;
        };
        let target_path = target_dir.join(relative_path);

        if entry.is_dir() {
            fs::create_dir_all(&target_path)
                .map_err(|error| format!("failed to create prerequisite target directory: {error}"))?;
            continue;
        }

        if let Some(parent_dir) = target_path.parent() {
            fs::create_dir_all(parent_dir)
                .map_err(|error| format!("failed to create prerequisite parent directory: {error}"))?;
        }

        let mut output_file = fs::File::create(&target_path).map_err(|error| {
            format!(
                "failed to create prerequisite extracted file {}: {error}",
                target_path.display()
            )
        })?;
        io::copy(&mut entry, &mut output_file).map_err(|error| {
            format!(
                "failed to extract prerequisite file from {} to {}: {error}",
                source_archive_path.display(),
                target_path.display()
            )
        })?;
    }

    Ok(())
}

fn build_asiloader_definition(modules_dir: &Path) -> Result<PrerequisiteDefinition, String> {
    build_single_file_definition(
        modules_dir,
        "asiloader",
        "ASILoader",
        ROOT_SCOPE,
        "ASILoader",
        "dinput8.dll",
        "dinput8.dll",
        "asiloader",
        true,
        true,
    )
}

fn build_d3d8to9_definition(modules_dir: &Path) -> Result<PrerequisiteDefinition, String> {
    build_single_file_definition(
        modules_dir,
        "d3d8to9",
        "D3D8to9",
        ROOT_SCOPE,
        "D3D8to9",
        "d3d8.dll",
        "d3d8.dll",
        "d3d8to9",
        false,
        true,
    )
}

fn build_single_file_definition(
    modules_dir: &Path,
    key: &'static str,
    label: &str,
    scan_scope: &'static str,
    module_dir_name: &str,
    relative_source_path: &str,
    target_path: &str,
    storage_dir_name: &str,
    required: bool,
    can_uninstall: bool,
) -> Result<PrerequisiteDefinition, String> {
    let source_archive_path = modules_dir.join(format!("{module_dir_name}.zip"));
    let relative_paths = collect_relative_file_paths(&source_archive_path)?;
    if !relative_paths
        .iter()
        .any(|path| path.eq_ignore_ascii_case(relative_source_path))
    {
        return Err(format!(
            "未找到前置组件资源文件: {}",
            relative_source_path
        ));
    }

    Ok(PrerequisiteDefinition {
        key,
        label: label.to_string(),
        scan_scope,
        required,
        can_uninstall,
        plan: PrerequisiteInstallPlan {
            owner_id: format!("prerequisite-{storage_dir_name}"),
            storage_dir_name: storage_dir_name.to_string(),
            source_archive_path,
            files: vec![PrerequisiteFileMapping {
                relative_source_path: relative_source_path.to_string(),
                target_path: target_path.to_string(),
            }],
        },
    })
}

fn build_modloader_definition(modules_dir: &Path) -> Result<PrerequisiteDefinition, String> {
    let source_archive_path = modules_dir.join("ModLoader.zip");
    let files = collect_file_mappings(&source_archive_path, |relative_path| {
        if relative_path.eq_ignore_ascii_case("modloader.asi") {
            return Some("scripts/modloader.asi".to_string());
        }

        relative_path
            .strip_prefix("modloader/")
            .map(|_| relative_path.to_string())
    })?;

    Ok(PrerequisiteDefinition {
        key: "modloader",
        label: "ModLoader".to_string(),
        scan_scope: SCRIPTS_PLUGINS_SCOPE,
        required: true,
        can_uninstall: true,
        plan: PrerequisiteInstallPlan {
            owner_id: "prerequisite-modloader".to_string(),
            storage_dir_name: "modloader".to_string(),
            source_archive_path,
            files,
        },
    })
}

fn build_cleo_definition(modules_dir: &Path, game_type: &str) -> Result<PrerequisiteDefinition, String> {
    let (archive_name, storage_dir_name) = match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => ("III.zip", "cleo-iii"),
        "vc" => ("VC.zip", "cleo-vc"),
        _ => ("SA.zip", "cleo-sa"),
    };
    let source_archive_path = modules_dir.join("CLEO").join(archive_name);
    let cleo_folder_name =
        detect_archive_folder_name(&source_archive_path, "cleo")?.unwrap_or_else(|| "CLEO".to_string());
    let files = collect_file_mappings_many(&source_archive_path, |relative_path| {
        if relative_path.to_ascii_lowercase().ends_with(".asi") {
            let file_name = Path::new(relative_path).file_name()?.to_string_lossy().to_string();
            return Some(vec![format!("plugins/{file_name}")]);
        }

        if let Some(remainder) = relative_path.strip_prefix(&format!("{cleo_folder_name}/")) {
            return Some(vec![
                format!("CLEO/{remainder}"),
                format!("plugins/CLEO/{remainder}"),
            ]);
        }

        Some(vec![relative_path.to_string()])
    })?;

    Ok(PrerequisiteDefinition {
        key: "cleo",
        label: "CLEO".to_string(),
        scan_scope: ROOT_SCOPE,
        required: false,
        can_uninstall: true,
        plan: PrerequisiteInstallPlan {
            owner_id: format!("prerequisite-{storage_dir_name}"),
            storage_dir_name: storage_dir_name.to_string(),
            source_archive_path,
            files,
        },
    })
}

fn build_cleo_redux_definition(modules_dir: &Path) -> Result<PrerequisiteDefinition, String> {
    let source_archive_path = modules_dir.join("CLEO").join("Redux.zip");
    let files = collect_file_mappings_many(&source_archive_path, |relative_path| {
        if relative_path.eq_ignore_ascii_case("cleo_redux.asi") {
            return Some(vec!["plugins/cleo_redux.asi".to_string()]);
        }

        relative_path.strip_prefix("CLEO/").map(|remainder| {
            vec![
                format!("CLEO/{remainder}"),
                format!("plugins/CLEO/{remainder}"),
            ]
        })
    })?;

    Ok(PrerequisiteDefinition {
        key: "cleo_redux",
        label: "CLEO Redux".to_string(),
        scan_scope: SCRIPTS_PLUGINS_SCOPE,
        required: false,
        can_uninstall: true,
        plan: PrerequisiteInstallPlan {
            owner_id: "prerequisite-cleo-redux".to_string(),
            storage_dir_name: "cleo-redux".to_string(),
            source_archive_path,
            files,
        },
    })
}

fn build_silent_patch_definition(
    modules_dir: &Path,
    game_type: &str,
) -> Result<SilentPatchDefinition, String> {
    let archive_name = match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => "III.zip",
        "vc" => "VC.zip",
        _ => "SA.zip",
    };
    let storage_dir_name = format!("silentpatch-{}", game_type.trim().to_ascii_lowercase());
    let owner_id = format!("prerequisite-{storage_dir_name}");
    let source_archive_path = modules_dir.join("SilentPatch").join(archive_name);

    let core_files = collect_file_mappings(&source_archive_path, |relative_path| {
        let lower_path = relative_path.to_ascii_lowercase();
        if lower_path.ends_with(".asi") || lower_path.ends_with(".ini") {
            let file_name = Path::new(relative_path).file_name()?.to_string_lossy().to_string();
            return Some(format!("scripts/{file_name}"));
        }

        None
    })?;

    let wrapper_dir = silent_patch_modloader_wrapper_dir(game_type);
    let modloader_data_files = collect_file_mappings(&source_archive_path, |relative_path| {
        relative_path
            .strip_prefix("data/")
            .map(|_| format!("scripts/modloader/{wrapper_dir}/{relative_path}"))
    })?;

    let direct_data_files = collect_file_mappings(&source_archive_path, |relative_path| {
        relative_path
            .strip_prefix("data/")
            .map(|_| relative_path.to_string())
    })?;

    Ok(SilentPatchDefinition {
        label: silent_patch_label(game_type).to_string(),
        core_plan: PrerequisiteInstallPlan {
            owner_id: owner_id.clone(),
            storage_dir_name: storage_dir_name.clone(),
            source_archive_path: source_archive_path.clone(),
            files: core_files,
        },
        modloader_data_plan: PrerequisiteInstallPlan {
            owner_id: owner_id.clone(),
            storage_dir_name: storage_dir_name.clone(),
            source_archive_path: source_archive_path.clone(),
            files: modloader_data_files,
        },
        direct_data_plan: PrerequisiteInstallPlan {
            owner_id,
            storage_dir_name,
            source_archive_path,
            files: direct_data_files,
        },
    })
}

fn collect_file_mappings<F>(
    source_archive_path: &Path,
    mut map_target_path: F,
) -> Result<Vec<PrerequisiteFileMapping>, String>
where
    F: FnMut(&str) -> Option<String>,
{
    let relative_paths = collect_relative_file_paths(source_archive_path)?;
    let files = relative_paths
        .into_iter()
        .filter_map(|relative_path| {
            map_target_path(&relative_path).map(|target_path| PrerequisiteFileMapping {
                relative_source_path: relative_path,
                target_path,
            })
        })
        .collect::<Vec<_>>();

    if files.is_empty() {
        return Err(format!(
            "前置组件资源包中没有可安装文件: {}",
            source_archive_path.to_string_lossy()
        ));
    }

    Ok(files)
}

fn collect_file_mappings_many<F>(
    source_archive_path: &Path,
    mut map_target_paths: F,
) -> Result<Vec<PrerequisiteFileMapping>, String>
where
    F: FnMut(&str) -> Option<Vec<String>>,
{
    let relative_paths = collect_relative_file_paths(source_archive_path)?;
    let files = relative_paths
        .into_iter()
        .flat_map(|relative_path| {
            map_target_paths(&relative_path)
                .unwrap_or_default()
                .into_iter()
                .map(move |target_path| PrerequisiteFileMapping {
                    relative_source_path: relative_path.clone(),
                    target_path,
                })
        })
        .collect::<Vec<_>>();

    if files.is_empty() {
        return Err(format!(
            "前置组件资源包中没有可安装文件: {}",
            source_archive_path.to_string_lossy()
        ));
    }

    Ok(files)
}

fn collect_relative_file_paths(source_archive_path: &Path) -> Result<Vec<String>, String> {
    if !source_archive_path.is_file() {
        return Err(format!(
            "未找到前置组件资源包: {}",
            source_archive_path.to_string_lossy()
        ));
    }

    let archive_file = fs::File::open(source_archive_path).map_err(|error| {
        format!(
            "failed to open prerequisite archive {}: {error}",
            source_archive_path.display()
        )
    })?;
    let mut archive = zip::ZipArchive::new(archive_file).map_err(|error| {
        format!(
            "failed to read prerequisite archive {}: {error}",
            source_archive_path.display()
        )
    })?;
    let mut files = Vec::new();
    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(|error| {
            format!(
                "failed to read prerequisite archive entry from {}: {error}",
                source_archive_path.display()
            )
        })?;
        if entry.is_dir() {
            continue;
        }
        let Some(relative_path) = entry.enclosed_name() else {
            continue;
        };
        files.push(relative_path.to_string_lossy().replace('\\', "/"));
    }
    files.sort();
    Ok(files)
}

fn detect_archive_folder_name(
    source_archive_path: &Path,
    expected_folder_name: &str,
) -> Result<Option<String>, String> {
    let relative_paths = collect_relative_file_paths(source_archive_path)?;
    Ok(relative_paths.into_iter().find_map(|relative_path| {
        let folder_name = relative_path.split('/').next()?;
        folder_name
            .eq_ignore_ascii_case(expected_folder_name)
            .then(|| folder_name.to_string())
    }))
}

fn resolve_modules_dir(paths: &StoragePaths) -> Result<PathBuf, String> {
    let modules_dir = paths.resource_dir.join("resources").join("modules");
    if modules_dir.is_dir() {
        return Ok(modules_dir);
    }
    Err(format!(
        "未找到新的内置前置组件资源目录: {}",
        modules_dir.to_string_lossy()
    ))
}

fn silent_patch_file_name(game_type: &str) -> &'static str {
    match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => "SilentPatchIII.asi",
        "vc" => "SilentPatchVC.asi",
        _ => "SilentPatchSA.asi",
    }
}

fn silent_patch_label(game_type: &str) -> &'static str {
    match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => "SilentPatch III",
        "vc" => "SilentPatch VC",
        _ => "SilentPatch SA",
    }
}

fn silent_patch_modloader_wrapper_dir(game_type: &str) -> String {
    format!("[G2M] {}", silent_patch_label(game_type))
}

fn cleo_canonical_asi_target(game_type: &str) -> String {
    format!("plugins/{}", cleo_primary_asi_name(game_type))
}

fn cleo_primary_asi_name(game_type: &str) -> &'static str {
    match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => "III.CLEO.asi",
        "vc" => "VC.CLEO.asi",
        _ => "CLEO.asi",
    }
}

fn cleo_asi_file_names(game_type: &str) -> Vec<&'static str> {
    match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => vec!["III.CLEO.asi", "CLEO.asi", "cleo.asi"],
        "vc" => vec!["VC.CLEO.asi", "CLEO.asi", "cleo.asi"],
        _ => vec!["CLEO.asi", "cleo.asi"],
    }
}

fn primary_asi_rule_for_key(prerequisite_key: &str, game_type: &str) -> Option<(String, Vec<&'static str>)> {
    match prerequisite_key {
        "modloader" => Some(("scripts/modloader.asi".to_string(), vec!["modloader.asi"])),
        "cleo" => Some((cleo_canonical_asi_target(game_type), cleo_asi_file_names(game_type))),
        "cleo_redux" => Some(("plugins/cleo_redux.asi".to_string(), vec!["cleo_redux.asi"])),
        "silentpatch" => Some((
            format!("scripts/{}", silent_patch_file_name(game_type)),
            vec![silent_patch_file_name(game_type)],
        )),
        _ => None,
    }
}
