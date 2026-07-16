use std::{
    fs, io,
    path::{Path, PathBuf},
};

use crate::{
    format_symlink_creation_error, normalize_import_target_path, paths_equal,
    resolve_game_target_path, ModInstallFileRecord,
};

const RESERVED_INSTALL_ROOTS: &[&str] = &["modloader", "cleo", "plugins", "scripts"];
const WORKSPACE_RUNTIME_ROOT_OWNER: &str = "__runtime_roots__";

#[cfg(target_family = "unix")]
use std::os::unix::fs::symlink as create_directory_symlink;
#[cfg(target_family = "unix")]
use std::os::unix::fs::symlink as create_file_symlink;
#[cfg(target_family = "windows")]
use std::os::windows::fs::symlink_dir as create_directory_symlink;
#[cfg(target_family = "windows")]
use std::os::windows::fs::symlink_file as create_file_symlink;

pub(crate) fn create_mod_symlinks(
    game_path: &Path,
    mod_id: &str,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
    overwrite_targets: &[String],
) -> Result<(), String> {
    create_symlinks(
        game_path,
        mod_id,
        mod_source_dir,
        files,
        overwrite_targets,
        true,
        true,
    )
}

fn create_symlinks(
    game_path: &Path,
    owner_id: &str,
    source_dir: &Path,
    files: &[ModInstallFileRecord],
    overwrite_targets: &[String],
    reserve_install_roots: bool,
    cleanup_legacy_targets: bool,
) -> Result<(), String> {
    if cleanup_legacy_targets {
        cleanup_legacy_mod_root_symlinks(game_path, source_dir, files)?;
    }

    ensure_runtime_root_symlinks(game_path, files)?;

    let overwrite_targets = overwrite_targets
        .iter()
        .map(|target_path| normalize_import_target_path(target_path))
        .collect::<std::collections::HashSet<_>>();
    let directory_candidates = build_directory_symlink_candidates(
        source_dir,
        game_path,
        owner_id,
        files,
        reserve_install_roots,
        true,
    )?;
    let covered_targets = directory_candidates
        .iter()
        .flat_map(|candidate| candidate.covered_targets.iter().cloned())
        .collect::<std::collections::HashSet<_>>();
    let mut applied_targets: Vec<AppliedSymlinkTarget> = Vec::new();

    for candidate in &directory_candidates {
        let should_overwrite = candidate
            .covered_targets
            .iter()
            .all(|target_path| overwrite_targets.contains(target_path))
            || candidate.backup_path.exists();

        if let Err(error) = create_directory_symlink_at_target(
            &candidate.source_path,
            &candidate.target_path,
            &candidate.backup_path,
            should_overwrite,
        ) {
            rollback_applied_symlink_targets(&applied_targets);
            return Err(error);
        }

        applied_targets.push(AppliedSymlinkTarget {
            source_path: candidate.source_path.clone(),
            target_path: candidate.target_path.clone(),
            backup_path: candidate.backup_path.clone(),
            kind: SymlinkTargetKind::Directory,
        });
    }

    for file in files {
        if file.target_path.trim().is_empty() {
            continue;
        }

        if covered_targets.contains(&normalize_import_target_path(&file.target_path)) {
            continue;
        }

        let source_path = Path::new(&file.source_path);
        let target_path = resolve_game_target_path(game_path, &file.target_path);
        let backup_path = resolve_backup_target_path(game_path, owner_id, &file.target_path);
        let should_overwrite = overwrite_targets.contains(&normalize_import_target_path(&file.target_path))
            || backup_path.exists();

        if let Err(error) =
            create_file_symlink_at_target(source_path, &target_path, &backup_path, should_overwrite)
        {
            rollback_applied_symlink_targets(&applied_targets);
            return Err(error);
        }

        applied_targets.push(AppliedSymlinkTarget {
            source_path: source_path.to_path_buf(),
            target_path,
            backup_path,
            kind: SymlinkTargetKind::File,
        });
    }

    Ok(())
}

fn ensure_runtime_root_symlinks(
    game_path: &Path,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    for root_name in ["scripts", "plugins"] {
        let should_link_root = files.iter().any(|file| {
            let normalized_target = normalize_import_target_path(&file.target_path);
            normalized_target.eq_ignore_ascii_case(root_name)
                || normalized_target
                    .to_ascii_lowercase()
                    .starts_with(&format!("{root_name}/"))
        });
        if !should_link_root {
            continue;
        }

        ensure_runtime_root_symlink(game_path, root_name)?;
    }

    Ok(())
}

fn ensure_runtime_root_symlink(game_path: &Path, root_name: &str) -> Result<(), String> {
    let source_dir = game_path
        .join(crate::GAME_WORKSPACE_DIR_NAME)
        .join("runtime")
        .join(root_name);
    fs::create_dir_all(&source_dir)
        .map_err(|error| format!("failed to create workspace runtime directory: {error}"))?;

    let target_path = resolve_game_target_path(game_path, root_name);
    let backup_path = resolve_backup_target_path(game_path, WORKSPACE_RUNTIME_ROOT_OWNER, root_name);
    let metadata = match fs::symlink_metadata(&target_path) {
        Ok(metadata) => Some(metadata),
        Err(error) if error.kind() == io::ErrorKind::NotFound => None,
        Err(error) => {
            return Err(format!(
                "failed to inspect runtime root before symlink creation: {error}"
            ));
        }
    };

    if let Some(metadata) = metadata {
        if metadata.file_type().is_symlink() {
            let current_target = resolve_link_target(&target_path)?;
            let expected_target = normalize_existing_path(&source_dir);
            if paths_equal(&current_target, &expected_target) {
                return Ok(());
            }
        } else if metadata.is_dir() {
            if !backup_path.exists() {
                backup_existing_target(&target_path, &backup_path)?;
                copy_non_symlink_directory_contents(&backup_path, &source_dir)?;
            } else {
                remove_path_if_exists(&target_path)?;
            }
        } else if !backup_path.exists() {
            backup_existing_target(&target_path, &backup_path)?;
        } else {
            remove_path_if_exists(&target_path)?;
        }
    }

    create_directory_symlink_at_target(&source_dir, &target_path, &backup_path, true)
}

fn copy_non_symlink_directory_contents(source_dir: &Path, target_dir: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source_dir)
        .map_err(|error| format!("failed to inspect runtime backup directory: {error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(source_dir)
        .map_err(|error| format!("failed to read runtime backup directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to read runtime backup entry: {error}"))?;
        let source_path = entry.path();
        let target_path = target_dir.join(entry.file_name());
        let entry_metadata = fs::symlink_metadata(&source_path)
            .map_err(|error| format!("failed to inspect runtime backup entry metadata: {error}"))?;

        if entry_metadata.file_type().is_symlink() {
            continue;
        }

        if entry_metadata.is_dir() {
            fs::create_dir_all(&target_path)
                .map_err(|error| format!("failed to create runtime target directory: {error}"))?;
            copy_non_symlink_directory_contents(&source_path, &target_path)?;
            continue;
        }

        if let Some(parent_dir) = target_path.parent() {
            fs::create_dir_all(parent_dir)
                .map_err(|error| format!("failed to create runtime target parent directory: {error}"))?;
        }

        if !target_path.exists() {
            fs::copy(&source_path, &target_path)
                .map_err(|error| format!("failed to migrate runtime file into workspace: {error}"))?;
        }
    }

    Ok(())
}

pub(crate) fn remove_mod_symlinks(
    game_path: &Path,
    mod_id: &str,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    remove_symlinks(game_path, mod_id, mod_source_dir, files, true, true)
}

fn remove_symlinks(
    game_path: &Path,
    owner_id: &str,
    source_dir: &Path,
    files: &[ModInstallFileRecord],
    reserve_install_roots: bool,
    cleanup_legacy_targets: bool,
) -> Result<(), String> {
    let directory_candidates = build_directory_symlink_candidates(
        source_dir,
        game_path,
        owner_id,
        files,
        reserve_install_roots,
        false,
    )?;
    let covered_targets = directory_candidates
        .iter()
        .flat_map(|candidate| candidate.covered_targets.iter().cloned())
        .collect::<std::collections::HashSet<_>>();

    for candidate in &directory_candidates {
        let removed =
            remove_directory_symlink_if_matches(&candidate.source_path, &candidate.target_path)?;
        if removed {
            restore_target_from_backup(&candidate.target_path, &candidate.backup_path)?;
        }
    }

    for file in files {
        if file.target_path.trim().is_empty() {
            continue;
        }

        if covered_targets.contains(&normalize_import_target_path(&file.target_path)) {
            continue;
        }

        let source_path = Path::new(&file.source_path);
        let target_path = resolve_game_target_path(game_path, &file.target_path);
        let backup_path = resolve_backup_target_path(game_path, owner_id, &file.target_path);
        let removed = remove_file_symlink_if_matches(source_path, &target_path)?;
        if removed {
            restore_target_from_backup(&target_path, &backup_path)?;
        }
    }

    if cleanup_legacy_targets {
        cleanup_legacy_mod_root_symlinks(game_path, source_dir, files)?;
    }

    Ok(())
}

pub(crate) fn count_missing_mod_targets(
    game_path: &Path,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
) -> Result<i64, String> {
    let mut covered_targets = std::collections::HashSet::new();
    let mut missing_target_count = count_missing_runtime_root_targets(
        game_path,
        files,
        &mut covered_targets,
    )?;
    let directory_candidates = build_directory_symlink_candidates(
        mod_source_dir,
        game_path,
        "__health__",
        files,
        true,
        false,
    )?;

    for candidate in &directory_candidates {
        let is_expected_directory_symlink =
            is_directory_symlink_pointing_to_source(&candidate.target_path, &candidate.source_path)?;
        if is_expected_directory_symlink {
            covered_targets.extend(candidate.covered_targets.iter().cloned());
            continue;
        }

        let missing_covered_targets = candidate
            .covered_targets
            .iter()
            .filter(|target_path| !resolve_game_target_path(game_path, target_path).exists())
            .count();
        if missing_covered_targets == 0 {
            covered_targets.extend(candidate.covered_targets.iter().cloned());
            continue;
        }

        if !candidate.target_path.exists() && missing_covered_targets == candidate.covered_targets.len() {
            covered_targets.extend(candidate.covered_targets.iter().cloned());
            missing_target_count += 1;
        }
    }

    for file in files {
        if file.target_path.trim().is_empty() {
            continue;
        }

        if covered_targets.contains(&normalize_import_target_path(&file.target_path)) {
            continue;
        }

        if !resolve_game_target_path(game_path, &file.target_path).exists() {
            missing_target_count += 1;
        }
    }

    Ok(missing_target_count)
}

fn count_missing_runtime_root_targets(
    game_path: &Path,
    files: &[ModInstallFileRecord],
    covered_targets: &mut std::collections::HashSet<String>,
) -> Result<i64, String> {
    let mut missing_target_count = 0_i64;

    for root_name in ["scripts", "plugins"] {
        let runtime_root_targets = files
            .iter()
            .filter_map(|file| {
                let normalized_target = normalize_import_target_path(&file.target_path);
                if normalized_target.eq_ignore_ascii_case(root_name)
                    || normalized_target
                        .to_ascii_lowercase()
                        .starts_with(&format!("{root_name}/"))
                {
                    return Some(normalized_target);
                }

                None
            })
            .collect::<std::collections::BTreeSet<_>>();
        if runtime_root_targets.is_empty() {
            continue;
        }

        let runtime_source_dir = game_path
            .join(crate::GAME_WORKSPACE_DIR_NAME)
            .join("runtime")
            .join(root_name);
        let runtime_target_path = resolve_game_target_path(game_path, root_name);
        let is_expected_runtime_root =
            is_directory_symlink_pointing_to_source(&runtime_target_path, &runtime_source_dir)?;
        if is_expected_runtime_root {
            covered_targets.extend(runtime_root_targets);
            continue;
        }

        let has_missing_runtime_targets = runtime_root_targets
            .iter()
            .any(|target_path| !resolve_game_target_path(game_path, target_path).exists());
        if !runtime_target_path.exists() || has_missing_runtime_targets {
            covered_targets.extend(runtime_root_targets);
            missing_target_count += 1;
        }
    }

    Ok(missing_target_count)
}

pub(crate) fn cleanup_legacy_mod_root_symlinks(
    game_path: &Path,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    let legacy_targets =
        collect_legacy_mod_root_symlink_targets(game_path, mod_source_dir, files);

    for (target_path, expected_source_path) in legacy_targets {
        remove_legacy_directory_symlink_if_matches(&target_path, &expected_source_path)?;
    }

    Ok(())
}

pub(crate) fn remove_path_if_exists(path: &Path) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("failed to inspect existing path: {error}")),
    };

    clear_readonly_recursive(path, &metadata)?;

    if metadata.is_dir() && !metadata.file_type().is_symlink() {
        fs::remove_dir_all(path).map_err(|error| format!("failed to remove directory: {error}"))?;
        return Ok(());
    }

    if metadata.file_type().is_symlink() {
        let is_directory_link = fs::metadata(path)
            .map(|target_metadata| target_metadata.is_dir())
            .unwrap_or(false);
        remove_symlink_path(path, is_directory_link)
            .map_err(|error| format!("failed to remove symlink: {error}"))?;
        return Ok(());
    }

    fs::remove_file(path).map_err(|error| format!("failed to remove file: {error}"))?;
    Ok(())
}

fn clear_readonly_recursive(path: &Path, metadata: &fs::Metadata) -> Result<(), String> {
    if metadata.file_type().is_symlink() {
        return Ok(());
    }

    let permissions = metadata.permissions();
    if permissions.readonly() {
        #[allow(unused_mut)]
        let mut next_permissions = permissions;
        next_permissions.set_readonly(false);
        fs::set_permissions(path, next_permissions)
            .map_err(|error| format!("failed to clear readonly attribute: {error}"))?;
    }

    if !metadata.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(path)
        .map_err(|error| format!("failed to read directory before removal: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to inspect directory entry before removal: {error}"))?;
        let entry_path = entry.path();
        let entry_metadata = fs::symlink_metadata(&entry_path)
            .map_err(|error| format!("failed to inspect child path before removal: {error}"))?;
        clear_readonly_recursive(&entry_path, &entry_metadata)?;
    }

    Ok(())
}

struct DirectorySymlinkCandidate {
    source_path: PathBuf,
    target_path: PathBuf,
    backup_path: PathBuf,
    covered_targets: Vec<String>,
}

struct AppliedSymlinkTarget {
    source_path: PathBuf,
    target_path: PathBuf,
    backup_path: PathBuf,
    kind: SymlinkTargetKind,
}

enum SymlinkTargetKind {
    Directory,
    File,
}

fn build_directory_symlink_candidates(
    mod_source_dir: &Path,
    game_path: &Path,
    mod_id: &str,
    files: &[ModInstallFileRecord],
    reserve_install_roots: bool,
    require_exact_contents: bool,
) -> Result<Vec<DirectorySymlinkCandidate>, String> {
    let mut groups = std::collections::BTreeMap::<(String, String), Vec<String>>::new();

    for file in files {
        let source_path = Path::new(&file.source_path);
        let Ok(relative_path) = source_path.strip_prefix(mod_source_dir) else {
            continue;
        };
        let normalized_relative_path = relative_path.to_string_lossy().replace('\\', "/");
        let segments = normalized_relative_path
            .split('/')
            .filter(|segment| !segment.is_empty())
            .collect::<Vec<_>>();
        if segments.len() <= 1 {
            continue;
        }

        let source_folder_relative = if RESERVED_INSTALL_ROOTS
            .iter()
            .any(|reserved| segments[0].eq_ignore_ascii_case(reserved))
        {
            if segments.len() <= 2 {
                continue;
            }

            format!("{}/{}", segments[0], segments[1])
        } else {
            segments[0].to_string()
        };
        let prefix = format!("{source_folder_relative}/");
        let remainder = normalized_relative_path.strip_prefix(&prefix).unwrap_or_default();
        if remainder.is_empty() {
            continue;
        }

        let normalized_target_path = normalize_import_target_path(&file.target_path);
        if normalized_target_path.is_empty() {
            continue;
        }

        let suffix = format!("/{remainder}");
        if !normalized_target_path.ends_with(&suffix) {
            continue;
        }

        let target_directory =
            normalized_target_path[..normalized_target_path.len() - suffix.len()].to_string();
        groups
            .entry((source_folder_relative, target_directory))
            .or_default()
            .push(normalized_target_path);
    }

    let mut candidates = Vec::new();
    for ((source_folder_relative, target_directory), covered_targets) in groups {
        let source_root = source_folder_relative
            .split('/')
            .find(|segment| !segment.is_empty())
            .unwrap_or_default();
        if reserve_install_roots
            && RESERVED_INSTALL_ROOTS
                .iter()
                .any(|reserved| source_folder_relative.eq_ignore_ascii_case(reserved))
        {
            continue;
        }

        let source_folder = source_folder_relative
            .split('/')
            .filter(|segment| !segment.is_empty())
            .fold(mod_source_dir.to_path_buf(), |current, segment| current.join(segment));
        if require_exact_contents {
            if !source_folder.is_dir() {
                continue;
            }

            let actual_entries = collect_directory_file_entries(&source_folder)?;
            let expected_entries = covered_targets
                .iter()
                .filter_map(|normalized_target_path| {
                    let prefix = if target_directory.is_empty() {
                        String::new()
                    } else {
                        format!("{target_directory}/")
                    };
                    normalized_target_path
                        .strip_prefix(&prefix)
                        .map(|remainder| remainder.to_string())
                })
                .collect::<std::collections::HashSet<_>>();

            if actual_entries != expected_entries {
                continue;
            }
        }

        candidates.push(DirectorySymlinkCandidate {
            source_path: source_folder,
            target_path: resolve_game_target_path(game_path, &target_directory),
            backup_path: resolve_backup_target_path(game_path, mod_id, &target_directory),
            covered_targets,
        });

        let _ = source_root;
    }

    Ok(candidates)
}

fn collect_legacy_mod_root_symlink_targets(
    game_path: &Path,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
) -> Vec<(PathBuf, PathBuf)> {
    let mut targets = std::collections::BTreeMap::<PathBuf, PathBuf>::new();

    for file in files {
        let normalized_target_path = normalize_import_target_path(&file.target_path);
        let segments = normalized_target_path
            .split('/')
            .filter(|segment| !segment.is_empty())
            .collect::<Vec<_>>();
        if segments.len() < 2 {
            continue;
        }

        let install_root = segments[0];
        let wrapper_dir = segments[1];
        if !RESERVED_INSTALL_ROOTS
            .iter()
            .any(|reserved| install_root.eq_ignore_ascii_case(reserved))
        {
            continue;
        }
        if !wrapper_dir.starts_with("[G2M] ") {
            continue;
        }

        let expected_source_path = mod_source_dir.join(install_root);
        let legacy_target_path = resolve_game_target_path(
            game_path,
            &format!("{install_root}/{wrapper_dir}/{install_root}"),
        );
        targets.insert(legacy_target_path, expected_source_path);
    }

    targets.into_iter().collect()
}

fn collect_directory_file_entries(directory: &Path) -> Result<std::collections::HashSet<String>, String> {
    let mut entries = std::collections::HashSet::new();
    collect_directory_file_entries_recursive(directory, directory, &mut entries)?;
    Ok(entries)
}

fn collect_directory_file_entries_recursive(
    base_dir: &Path,
    current_dir: &Path,
    entries: &mut std::collections::HashSet<String>,
) -> Result<(), String> {
    for entry in fs::read_dir(current_dir)
        .map_err(|error| format!("failed to read directory entries for {}: {error}", current_dir.display()))?
    {
        let entry = entry.map_err(|error| format!("failed to read directory entry: {error}"))?;
        let path = entry.path();

        if path.is_dir() {
            collect_directory_file_entries_recursive(base_dir, &path, entries)?;
            continue;
        }

        if !path.is_file() {
            continue;
        }

        let relative_path = path
            .strip_prefix(base_dir)
            .map_err(|error| format!("failed to build relative directory entry path: {error}"))?;
        entries.insert(relative_path.to_string_lossy().replace('\\', "/"));
    }

    Ok(())
}

fn rollback_applied_symlink_targets(applied_targets: &[AppliedSymlinkTarget]) {
    for target in applied_targets.iter().rev() {
        match target.kind {
            SymlinkTargetKind::Directory => {
                let _ = remove_directory_symlink_if_matches(&target.source_path, &target.target_path);
            }
            SymlinkTargetKind::File => {
                let _ = remove_file_symlink_if_matches(&target.source_path, &target.target_path);
            }
        }
        let _ = restore_target_from_backup(&target.target_path, &target.backup_path);
    }
}

fn create_directory_symlink_at_target(
    source_path: &Path,
    target_path: &Path,
    backup_path: &Path,
    allow_overwrite: bool,
) -> Result<(), String> {
    if !source_path.is_dir() {
        return Err(format!("软链接来源目录不存在: {}", source_path.display()));
    }

    ensure_target_parent_directory(target_path, backup_path, allow_overwrite)?;

    match fs::symlink_metadata(target_path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                let current_target = resolve_link_target(target_path)?;
                let expected_target = normalize_existing_path(source_path);
                if paths_equal(&current_target, &expected_target) {
                    return Ok(());
                }
            }

            if !allow_overwrite {
                return Err(format!(
                    "目标目录已存在，无法创建目录软链接: {}",
                    target_path.display()
                ));
            }

            backup_existing_target(target_path, backup_path)?;
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => {
            return Err(format!(
                "failed to inspect target directory before symlink creation: {error}"
            ));
        }
    }

    let link_parent = target_path
        .parent()
        .ok_or_else(|| format!("invalid symlink target path: {}", target_path.display()))?;
    let relative_source_path =
        build_relative_path(link_parent, source_path).unwrap_or_else(|| source_path.to_path_buf());

    create_directory_symlink(&relative_source_path, target_path)
        .map_err(format_symlink_creation_error)?;
    Ok(())
}

fn create_file_symlink_at_target(
    source_path: &Path,
    target_path: &Path,
    backup_path: &Path,
    allow_overwrite: bool,
) -> Result<(), String> {
    if !source_path.is_file() {
        return Err(format!("软链接来源文件不存在: {}", source_path.display()));
    }

    ensure_target_parent_directory(target_path, backup_path, allow_overwrite)?;

    match fs::symlink_metadata(target_path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() {
                let current_target = resolve_link_target(target_path)?;
                let expected_target = normalize_existing_path(source_path);
                if paths_equal(&current_target, &expected_target) {
                    return Ok(());
                }
            }

            if !allow_overwrite {
                return Err(format!(
                    "目标路径已存在，无法创建软链接: {}",
                    target_path.display()
                ));
            }

            backup_existing_target(target_path, backup_path)?;
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => {
            return Err(format!(
                "failed to inspect target path before symlink creation: {error}"
            ));
        }
    }

    let link_parent = target_path
        .parent()
        .ok_or_else(|| format!("invalid symlink target path: {}", target_path.display()))?;
    let relative_source_path = build_relative_path(link_parent, source_path)
        .unwrap_or_else(|| source_path.to_path_buf());

    create_file_symlink(&relative_source_path, target_path).map_err(format_symlink_creation_error)?;
    Ok(())
}

fn remove_directory_symlink_if_matches(source_path: &Path, target_path: &Path) -> Result<bool, String> {
    let metadata = match fs::symlink_metadata(target_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(error) => {
            return Err(format!(
                "failed to inspect target path before directory symlink removal: {error}"
            ));
        }
    };

    if !metadata.file_type().is_symlink() {
        return Ok(false);
    }

    let current_target = resolve_link_target(target_path)?;
    let expected_target = normalize_existing_path(source_path);
    if !paths_equal(&current_target, &expected_target) {
        return Ok(false);
    }

    let _ = source_path;
    remove_symlink_path(target_path, true)
        .map_err(|error| format!("failed to remove mod directory symlink: {error}"))?;
    Ok(true)
}

fn is_directory_symlink_pointing_to_source(target_path: &Path, source_path: &Path) -> Result<bool, String> {
    let metadata = match fs::symlink_metadata(target_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(error) => {
            return Err(format!(
                "failed to inspect target path before directory symlink validation: {error}"
            ));
        }
    };

    if !metadata.file_type().is_symlink() {
        return Ok(false);
    }

    let current_target = resolve_link_target(target_path)?;
    let expected_target = normalize_existing_path(source_path);
    Ok(paths_equal(&current_target, &expected_target))
}

fn ensure_target_parent_directory(
    target_path: &Path,
    backup_path: &Path,
    allow_overwrite: bool,
) -> Result<(), String> {
    let Some(parent_dir) = target_path.parent() else {
        return Ok(());
    };

    let ancestors = parent_dir.ancestors().collect::<Vec<_>>();
    for current_path in ancestors.into_iter().rev() {
        let metadata = match fs::symlink_metadata(current_path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == io::ErrorKind::NotFound => {
                fs::create_dir(current_path)
                    .map_err(|create_error| format!("failed to create target directory: {create_error}"))?;
                continue;
            }
            Err(error) => {
                return Err(format!(
                    "failed to inspect target directory before symlink creation: {error}"
                ));
            }
        };

        if metadata.is_dir() && !metadata.file_type().is_symlink() {
            continue;
        }

        if metadata.file_type().is_symlink()
            && fs::metadata(current_path)
                .map(|target_metadata| target_metadata.is_dir())
                .unwrap_or(false)
        {
            continue;
        }

        if !allow_overwrite {
            return Err(format!(
                "安装目标的父路径已存在且不是文件夹: {}",
                current_path.display()
            ));
        }

        let current_backup_path = derive_nested_backup_path(target_path, backup_path, current_path)
            .unwrap_or_else(|| backup_path.to_path_buf());
        backup_existing_target(current_path, &current_backup_path)?;
        fs::create_dir_all(current_path)
            .map_err(|error| format!("failed to create target directory: {error}"))?;
    }

    Ok(())
}

fn derive_nested_backup_path(target_path: &Path, backup_path: &Path, nested_path: &Path) -> Option<PathBuf> {
    let nested_relative_path = target_path.strip_prefix(nested_path).ok()?;
    let mut resolved_backup_path = backup_path.to_path_buf();

    for _ in nested_relative_path.components() {
        resolved_backup_path.pop();
    }

    Some(resolved_backup_path)
}

fn remove_file_symlink_if_matches(source_path: &Path, target_path: &Path) -> Result<bool, String> {
    let metadata = match fs::symlink_metadata(target_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(error) => {
            return Err(format!(
                "failed to inspect target path before symlink removal: {error}"
            ));
        }
    };

    if !metadata.file_type().is_symlink() {
        return Ok(false);
    }

    let current_target = resolve_link_target(target_path)?;
    let expected_target = normalize_existing_path(source_path);
    if !paths_equal(&current_target, &expected_target) {
        return Ok(false);
    }

    fs::remove_file(target_path).map_err(|error| format!("failed to remove mod symlink: {error}"))?;
    Ok(true)
}

fn remove_legacy_directory_symlink_if_matches(
    target_path: &Path,
    expected_source_path: &Path,
) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(target_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!(
                "failed to inspect legacy target path before cleanup: {error}"
            ));
        }
    };

    if !metadata.file_type().is_symlink() {
        return Ok(());
    }

    if target_path.exists() {
        let current_target = resolve_link_target(target_path)?;
        let expected_target = normalize_existing_path(expected_source_path);
        if !paths_equal(&current_target, &expected_target) {
            return Ok(());
        }
    }

    remove_symlink_path(target_path, true)
        .map_err(|error| format!("failed to remove legacy directory symlink: {error}"))?;
    Ok(())
}

pub(crate) fn backup_existing_target(target_path: &Path, backup_path: &Path) -> Result<(), String> {
    if let Some(parent_dir) = backup_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to create backup directory: {error}"))?;
    }

    remove_path_if_exists(backup_path)?;
    fs::rename(target_path, backup_path).map_err(|error| {
        format!(
            "failed to backup existing target {}: {error}",
            target_path.display()
        )
    })?;
    Ok(())
}

pub(crate) fn restore_target_from_backup(target_path: &Path, backup_path: &Path) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(backup_path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!(
                "failed to inspect backup before restore: {error}"
            ));
        }
    };

    if target_path.exists() {
        return Ok(());
    }

    if let Some(parent_dir) = target_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to recreate target directory: {error}"))?;
    }

    if metadata.file_type().is_symlink() {
        let link_target = fs::read_link(backup_path)
            .map_err(|error| format!("failed to read backup symlink target: {error}"))?;
        let is_directory_link = fs::metadata(backup_path)
            .map(|metadata| metadata.is_dir())
            .unwrap_or(false);
        if is_directory_link {
            create_directory_symlink(&link_target, target_path).map_err(format_symlink_creation_error)?;
        } else {
            create_file_symlink(&link_target, target_path).map_err(format_symlink_creation_error)?;
        }
        return Ok(());
    }

    if metadata.is_dir() {
        fs::rename(backup_path, target_path)
            .map_err(|error| format!("failed to restore backup directory: {error}"))?;
        return Ok(());
    }

    fs::copy(backup_path, target_path)
        .map_err(|error| format!("failed to restore backup file: {error}"))?;
    Ok(())
}

pub(crate) fn resolve_backup_target_path(game_path: &Path, mod_id: &str, target_path: &str) -> PathBuf {
    let mut resolved = game_path
        .join(crate::GAME_WORKSPACE_DIR_NAME)
        .join("backups")
        .join(mod_id);

    for segment in target_path.split('/').filter(|segment| !segment.is_empty()) {
        resolved.push(segment);
    }

    resolved
}

fn remove_symlink_path(path: &Path, directory_link: bool) -> io::Result<()> {
    #[cfg(target_family = "windows")]
    {
        if directory_link {
            return fs::remove_dir(path);
        }
    }

    let _ = directory_link;
    fs::remove_file(path)
}

fn resolve_link_target(link_path: &Path) -> Result<PathBuf, String> {
    let target = fs::read_link(link_path)
        .map_err(|error| format!("failed to read symlink target: {error}"))?;
    let resolved = if target.is_absolute() {
        target
    } else {
        link_path
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_default()
            .join(target)
    };

    Ok(normalize_existing_path(&resolved))
}

fn normalize_existing_path(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn build_relative_path(target_parent: &Path, source_path: &Path) -> Option<PathBuf> {
    let source_components = source_path
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect::<Vec<_>>();
    let base_components = target_parent
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect::<Vec<_>>();

    let mut shared = 0usize;
    while shared < source_components.len()
        && shared < base_components.len()
        && path_component_equals(&source_components[shared], &base_components[shared])
    {
        shared += 1;
    }

    if shared == 0 {
        return None;
    }

    let mut relative = PathBuf::new();
    for _ in shared..base_components.len() {
        relative.push("..");
    }
    for component in source_components.iter().skip(shared) {
        relative.push(component);
    }

    if relative.as_os_str().is_empty() {
        relative.push(".");
    }

    Some(relative)
}

fn path_component_equals(left: &str, right: &str) -> bool {
    #[cfg(target_family = "windows")]
    {
        left.eq_ignore_ascii_case(right)
    }

    #[cfg(not(target_family = "windows"))]
    {
        left == right
    }
}
