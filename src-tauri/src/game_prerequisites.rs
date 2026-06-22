use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{GameDirectory, GamePrerequisitePayload};

const ROOT_SCOPE: &str = "root";
const SCRIPTS_PLUGINS_SCOPE: &str = "scriptsPlugins";

pub(crate) fn detect_game_prerequisites(mut game: GameDirectory) -> GameDirectory {
    game.prerequisites = detect_for_path(Path::new(&game.path), &game.game_type);
    game
}

pub(crate) fn install_game_prerequisite(
    app_dir: &Path,
    game_path: &Path,
    game_type: &str,
    prerequisite_key: &str,
) -> Result<(), String> {
    let modules_dir = resolve_modules_dir(app_dir)?;

    match prerequisite_key.trim().to_ascii_lowercase().as_str() {
        "asiloader" => copy_file_to(
            &modules_dir.join("ASILoader").join("dinput8.dll"),
            &game_path.join("dinput8.dll"),
        ),
        "d3d8to9" => copy_file_to(
            &modules_dir.join("D3D8to9").join("d3d8.dll"),
            &game_path.join("d3d8.dll"),
        ),
        "silentpatch" => install_silent_patch(&modules_dir, game_path, game_type),
        "modloader" => Err("当前版本未内置 ModLoader 安装包".to_string()),
        other => Err(format!("不支持安装该前置组件: {other}")),
    }
}

fn resolve_modules_dir(app_dir: &Path) -> Result<PathBuf, String> {
    let runtime_modules_dir = app_dir.join("assets").join("modules");
    if runtime_modules_dir.is_dir() {
        return Ok(runtime_modules_dir);
    }

    let source_modules_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("assets")
        .join("modules");
    if source_modules_dir.is_dir() {
        return Ok(source_modules_dir);
    }

    Err("未找到内置前置组件资源目录".to_string())
}

fn detect_for_path(game_path: &Path, game_type: &str) -> Vec<GamePrerequisitePayload> {
    vec![
        detect_directory("modloader", "ModLoader", game_path.join("modloader")),
        detect_directory("cleo", "CLEO", game_path.join("CLEO")),
        detect_root_file("asiloader", "ASILoader", game_path.join("dinput8.dll")),
        detect_root_file("d3d8to9", "D3D8to9", game_path.join("d3d8.dll")),
        detect_asi_file(
            "silentpatch",
            silent_patch_label(game_type),
            silent_patch_file_name(game_type),
            game_path,
        ),
    ]
}

fn detect_directory(key: &str, label: &str, directory_path: PathBuf) -> GamePrerequisitePayload {
    let detected = directory_path.is_dir();

    GamePrerequisitePayload {
        key: key.to_string(),
        label: label.to_string(),
        detected,
        can_install: false,
        scan_scope: ROOT_SCOPE.to_string(),
        detected_path: detected.then(|| directory_path.to_string_lossy().to_string()),
    }
}

fn detect_root_file(key: &str, label: &str, file_path: PathBuf) -> GamePrerequisitePayload {
    let detected = file_path.is_file();

    GamePrerequisitePayload {
        key: key.to_string(),
        label: label.to_string(),
        detected,
        can_install: true,
        scan_scope: ROOT_SCOPE.to_string(),
        detected_path: detected.then(|| file_path.to_string_lossy().to_string()),
    }
}

fn detect_asi_file(
    key: &str,
    label: &str,
    file_name: &str,
    game_path: &Path,
) -> GamePrerequisitePayload {
    let detected_path = ["scripts", "plugins"]
        .iter()
        .map(|folder| game_path.join(folder))
        .find_map(|directory| find_file_case_insensitive(&directory, file_name));

    GamePrerequisitePayload {
        key: key.to_string(),
        label: label.to_string(),
        detected: detected_path.is_some(),
        can_install: true,
        scan_scope: SCRIPTS_PLUGINS_SCOPE.to_string(),
        detected_path: detected_path.map(|path| path.to_string_lossy().to_string()),
    }
}

fn install_silent_patch(modules_dir: &Path, game_path: &Path, game_type: &str) -> Result<(), String> {
    let module_dir = modules_dir.join(silent_patch_module_dir(game_type));
    if !module_dir.is_dir() {
        return Err(format!(
            "未找到 SilentPatch 安装资源: {}",
            module_dir.to_string_lossy()
        ));
    }

    let scripts_dir = game_path.join("scripts");
    fs::create_dir_all(&scripts_dir)
        .map_err(|error| format!("failed to create scripts directory: {error}"))?;

    let entries = fs::read_dir(&module_dir)
        .map_err(|error| format!("failed to read module directory: {error}"))?;

    for entry in entries.flatten() {
        let source_path = entry.path();
        let file_name = match source_path.file_name() {
            Some(value) => value.to_owned(),
            None => continue,
        };

        if source_path.is_dir() {
            if file_name.to_string_lossy().eq_ignore_ascii_case("data") {
                copy_directory_recursive(&source_path, &game_path.join("data"))?;
            }
            continue;
        }

        let lower_name = file_name.to_string_lossy().to_ascii_lowercase();
        if lower_name.ends_with(".asi") || lower_name.ends_with(".ini") {
            copy_file_to(&source_path, &scripts_dir.join(file_name))?;
        }
    }

    Ok(())
}

fn copy_file_to(source_path: &Path, target_path: &Path) -> Result<(), String> {
    if !source_path.is_file() {
        return Err(format!(
            "未找到安装文件: {}",
            source_path.to_string_lossy()
        ));
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create target directory: {error}"))?;
    }

    fs::copy(source_path, target_path).map_err(|error| {
        format!(
            "failed to copy file {} -> {}: {error}",
            source_path.to_string_lossy(),
            target_path.to_string_lossy()
        )
    })?;

    Ok(())
}

fn copy_directory_recursive(source_dir: &Path, target_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(target_dir)
        .map_err(|error| format!("failed to create target directory: {error}"))?;

    let entries = fs::read_dir(source_dir)
        .map_err(|error| format!("failed to read source directory: {error}"))?;

    for entry in entries.flatten() {
        let source_path = entry.path();
        let target_path = target_dir.join(entry.file_name());

        if source_path.is_dir() {
            copy_directory_recursive(&source_path, &target_path)?;
        } else {
            copy_file_to(&source_path, &target_path)?;
        }
    }

    Ok(())
}

fn find_file_case_insensitive(directory: &Path, file_name: &str) -> Option<PathBuf> {
    if !directory.is_dir() {
        return None;
    }

    let target_name = file_name.to_ascii_lowercase();
    let entries = fs::read_dir(directory).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            if let Some(found) = find_file_case_insensitive(&path, file_name) {
                return Some(found);
            }
            continue;
        }

        let entry_name = path.file_name()?.to_string_lossy().to_ascii_lowercase();
        if entry_name == target_name {
            return Some(path);
        }
    }

    None
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

fn silent_patch_module_dir(game_type: &str) -> &'static str {
    match game_type.trim().to_ascii_lowercase().as_str() {
        "iii" => "SilentPatchIII",
        "vc" => "SilentPatchVC",
        _ => "SilentPatchSA",
    }
}
