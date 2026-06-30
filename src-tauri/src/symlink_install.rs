use std::{
    fs, io,
    path::{Path, PathBuf},
};

use crate::{
    format_symlink_creation_error, normalize_import_target_path, paths_equal,
    resolve_game_target_path, ModInstallFileRecord,
};

const RESERVED_INSTALL_ROOTS: &[&str] = &["modloader", "cleo", "plugins", "scripts"];

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
    cleanup_legacy_mod_root_symlinks(game_path, mod_source_dir, files)?;

    let overwrite_targets = overwrite_targets
        .iter()
        .map(|target_path| normalize_import_target_path(target_path))
        .collect::<std::collections::HashSet<_>>();
    let directory_candidates =
        build_directory_symlink_candidates(mod_source_dir, game_path, mod_id, files)?;
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
        let backup_path = resolve_backup_target_path(game_path, mod_id, &file.target_path);
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

pub(crate) fn remove_mod_symlinks(
    game_path: &Path,
    mod_id: &str,
    mod_source_dir: &Path,
    files: &[ModInstallFileRecord],
) -> Result<(), String> {
    let directory_candidates =
        build_directory_symlink_candidates(mod_source_dir, game_path, mod_id, files)?;
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
        let backup_path = resolve_backup_target_path(game_path, mod_id, &file.target_path);
        let removed = remove_file_symlink_if_matches(source_path, &target_path)?;
        if removed {
            restore_target_from_backup(&target_path, &backup_path)?;
        }
    }

    cleanup_legacy_mod_root_symlinks(game_path, mod_source_dir, files)?;

    Ok(())
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

    if metadata.is_dir() && !metadata.file_type().is_symlink() {
        fs::remove_dir_all(path).map_err(|error| format!("failed to remove directory: {error}"))?;
        return Ok(());
    }

    fs::remove_file(path).map_err(|error| format!("failed to remove file: {error}"))?;
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
) -> Result<Vec<DirectorySymlinkCandidate>, String> {
    let mut groups = std::collections::BTreeMap::<String, Vec<(&ModInstallFileRecord, String)>>::new();

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

        groups
            .entry(segments[0].to_string())
            .or_default()
            .push((file, normalized_relative_path));
    }

    let mut candidates = Vec::new();
    for (folder_name, records) in groups {
        if RESERVED_INSTALL_ROOTS
            .iter()
            .any(|reserved| folder_name.eq_ignore_ascii_case(reserved))
        {
            continue;
        }

        let source_folder = mod_source_dir.join(&folder_name);
        if !source_folder.is_dir() {
            continue;
        }

        let mut expected_entries = std::collections::HashSet::new();
        let mut target_directories = std::collections::BTreeSet::new();
        let mut covered_targets = Vec::new();
        let mut valid = true;

        for (record, relative_path) in &records {
            let normalized_target_path = normalize_import_target_path(&record.target_path);
            if normalized_target_path.is_empty() {
                valid = false;
                break;
            }

            let prefix = format!("{folder_name}/");
            let remainder = relative_path.strip_prefix(&prefix).unwrap_or_default();
            if remainder.is_empty() {
                valid = false;
                break;
            }

            expected_entries.insert(remainder.to_string());
            let suffix = format!("/{remainder}");
            if !normalized_target_path.ends_with(&suffix) {
                valid = false;
                break;
            }

            target_directories
                .insert(normalized_target_path[..normalized_target_path.len() - suffix.len()].to_string());
            covered_targets.push(normalized_target_path);
        }

        if !valid || target_directories.len() != 1 {
            continue;
        }

        let actual_entries = collect_directory_file_entries(&source_folder)?;
        if actual_entries != expected_entries {
            continue;
        }

        let Some(target_directory) = target_directories.into_iter().next() else {
            continue;
        };

        candidates.push(DirectorySymlinkCandidate {
            source_path: source_folder,
            target_path: resolve_game_target_path(game_path, &target_directory),
            backup_path: resolve_backup_target_path(game_path, mod_id, &target_directory),
            covered_targets,
        });
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

    if let Some(parent_dir) = target_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to create target directory: {error}"))?;
    }

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

    if let Some(parent_dir) = target_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("failed to create target directory: {error}"))?;
    }

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

    remove_symlink_path(target_path, source_path.is_dir())
        .map_err(|error| format!("failed to remove mod directory symlink: {error}"))?;
    Ok(true)
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

fn backup_existing_target(target_path: &Path, backup_path: &Path) -> Result<(), String> {
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

fn restore_target_from_backup(target_path: &Path, backup_path: &Path) -> Result<(), String> {
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

fn resolve_backup_target_path(game_path: &Path, mod_id: &str, target_path: &str) -> PathBuf {
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
