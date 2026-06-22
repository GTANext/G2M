const versionAlpha: bool = true;

use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;
use tauri::AppHandle;

use crate::{
    AppInfoPayload,
    game_prerequisites::{detect_game_prerequisites, install_game_prerequisite},
    game_support::{
        canonical_game_name, cleanup_custom_game_cover, default_game_name,
        detect_game_installation, normalize_game_type, store_game_cover_image,
    },
    mod_import::{
        build_mod_import_preview, build_mod_source_preview, copy_directory_recursive,
        import_mod_into_database, inspect_mod_source_digest_payload, prepare_import_source,
        resolve_import_source,
        unique_directory_path, ImportFileOverride,
    },
    repository::{
        delete_game_entry_from_database, delete_mod_by_id, delete_mods_for_game,
        load_game_directories, load_mod_install_plan, load_mods, load_stored_game_by_id,
        load_stored_games, update_game_entry_in_database, update_mod_enabled_in_database,
    },
    storage::{ensure_game_workspace, ensure_game_workspaces, ensure_storage},
    symlink_install::{create_mod_symlinks, remove_mod_symlinks, remove_path_if_exists},
    utils::{current_timestamp, is_process_elevated, paths_equal},
    workspace_package::{import_game_packages_into_database, sync_game_packages},
    wrap_command, BootstrapPayload, CommandResponse, DetectedGamePayload,
    ManifestSourceDigestPayload, ModImportFileEntryInput, ModImportPreviewPayload,
};

#[tauri::command]
pub(crate) fn bootstrap_app(app: AppHandle) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| bootstrap_app_payload(&app))
}

#[tauri::command]
pub(crate) fn get_app_info() -> CommandResponse<AppInfoPayload> {
    wrap_command(|| {
        let config = load_tauri_config_info()?;
        Ok(AppInfoPayload {
            product_name: config.product_name,
            version: format!("v{}{}", config.version, if versionAlpha { "-alpha" } else { "" }),
        })
    })
}

fn bootstrap_app_payload(app: &AppHandle) -> Result<BootstrapPayload, String> {
    let paths = ensure_storage(app)?;
    let games = load_game_directories(&paths.database_path)?;
    ensure_game_workspaces(&games)?;
    import_game_packages_into_database(&paths.database_path, &games)?;
    let games = load_game_directories(&paths.database_path)?
        .into_iter()
        .map(detect_game_prerequisites)
        .collect::<Vec<_>>();
    sync_game_packages(&paths.database_path, &games)?;

    Ok(BootstrapPayload {
        data_dir: paths.app_dir.to_string_lossy().to_string(),
        database_path: paths.database_path.to_string_lossy().to_string(),
        is_elevated: is_process_elevated(),
        games,
        mods: load_mods(&paths.database_path)?,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriConfigInfo {
    product_name: String,
    version: String,
}

fn load_tauri_config_info() -> Result<TauriConfigInfo, String> {
    serde_json::from_str::<TauriConfigInfo>(include_str!("../tauri.conf.json"))
        .map_err(|error| format!("failed to parse tauri.conf.json: {error}"))
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn detect_game_directory(
    app: AppHandle,
    gamePath: String,
) -> CommandResponse<DetectedGamePayload> {
    wrap_command(|| {
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
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn generate_manifest_file(
    sourcePath: String,
    sourceType: String,
    manifestContent: String,
    savePath: Option<String>,
) -> CommandResponse<String> {
    wrap_command(|| {
        let source_path = sourcePath.trim();
        if source_path.is_empty() {
            return Err("source path is empty".to_string());
        }

        let target_path = match sourceType.trim() {
            "directory" => Path::new(source_path).join("g2m.json"),
            "zip" => {
                let selected_path = savePath.unwrap_or_default();
                let selected_path = selected_path.trim();
                if selected_path.is_empty() {
                    return Err("save path is empty".to_string());
                }

                let mut path = PathBuf::from(selected_path);
                if path.extension().is_none() {
                    path.set_extension("json");
                }
                path
            }
            other => return Err(format!("unsupported source type: {other}")),
        };

        if let Some(parent_dir) = target_path.parent() {
            if !parent_dir.as_os_str().is_empty() {
                fs::create_dir_all(parent_dir)
                    .map_err(|error| format!("failed to create manifest directory: {error}"))?;
            }
        }

        fs::write(&target_path, manifestContent)
            .map_err(|error| format!("failed to write g2m.json: {error}"))?;

        Ok(target_path.to_string_lossy().to_string())
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn inspect_mod_source_digest(
    sourcePath: String,
    sourceType: String,
) -> CommandResponse<ManifestSourceDigestPayload> {
    wrap_command(|| inspect_mod_source_digest_payload(&sourcePath, &sourceType))
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn save_game_path(
    app: AppHandle,
    gamePath: String,
    gameType: String,
    name: String,
    version: Option<String>,
    coverImageSourcePath: Option<String>,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let existing_games = load_stored_games(&paths.database_path)?;
        let normalized_path = gamePath.trim();

        if normalized_path.is_empty() {
            return Err("game path is empty".to_string());
        }

        let mut detected_game =
            detect_game_installation(Path::new(normalized_path), &existing_games)?;

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

        if let Err(error) = crate::insert_game_entry(&paths.database_path, &detected_game) {
            cleanup_custom_game_cover(&paths.custom_assets_dir, &detected_game.image_path)?;
            return Err(error);
        }
        ensure_game_workspace(Path::new(normalized_path))?;

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn update_game_entry(
    app: AppHandle,
    gameId: String,
    gameType: String,
    name: String,
    version: Option<String>,
    coverImageSourcePath: Option<String>,
    useDefaultImage: bool,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
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

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn delete_game_entry(
    app: AppHandle,
    gameId: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
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

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn delete_mod_entry(
    app: AppHandle,
    modId: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let install_plan = load_mod_install_plan(&paths.database_path, &modId)?
            .ok_or_else(|| "未找到要删除的 Mod".to_string())?;

        remove_mod_symlinks(
            Path::new(&install_plan.game_path),
            &install_plan.mod_id,
            Path::new(&install_plan.source_dir),
            &install_plan.files,
        )?;
        delete_mod_by_id(&paths.database_path, &modId)?;

        let _ = remove_path_if_exists(Path::new(&install_plan.source_dir));

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn update_mod_enabled(
    app: AppHandle,
    modId: String,
    enabled: bool,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let install_plan = load_mod_install_plan(&paths.database_path, &modId)?
            .ok_or_else(|| "未找到要更新的 Mod".to_string())?;

        if enabled {
            create_mod_symlinks(
                Path::new(&install_plan.game_path),
                &install_plan.mod_id,
                Path::new(&install_plan.source_dir),
                &install_plan.files,
                &[],
            )?;
        } else {
            remove_mod_symlinks(
                Path::new(&install_plan.game_path),
                &install_plan.mod_id,
                Path::new(&install_plan.source_dir),
                &install_plan.files,
            )?;
        }

        let updated_rows = update_mod_enabled_in_database(&paths.database_path, &modId, enabled)?;

        if updated_rows == 0 {
            return Err("未找到要更新的 Mod".to_string());
        }

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn preview_mod_directory(
    app: AppHandle,
    gameId: String,
    modPath: String,
    modName: Option<String>,
) -> CommandResponse<ModImportPreviewPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let (game, source) = resolve_import_source(&paths.database_path, &gameId, &modPath)?;
        let mod_name_override = modName
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(source.display_name.as_str());

        build_mod_import_preview(
            &paths.database_path,
            &gameId,
            &game.game_type,
            &source.source_dir,
            Some(mod_name_override),
        )
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn inspect_mod_source(
    modPath: String,
    modName: Option<String>,
) -> CommandResponse<ModImportPreviewPayload> {
    wrap_command(|| {
        let source = prepare_import_source(&modPath)?;
        let mod_name_override = modName
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(source.display_name.as_str());

        build_mod_source_preview(&source.source_dir, Some(mod_name_override))
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn import_mod_directory(
    app: AppHandle,
    gameId: String,
    modPath: String,
    modName: Option<String>,
    files: Option<Vec<ModImportFileEntryInput>>,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
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

        copy_directory_recursive(&source.source_dir, &target_dir, Some(&game.game_type))?;

        let file_overrides = files.as_ref().map(|entries| {
            entries
                .iter()
                .map(|file| ImportFileOverride {
                    relative_path: file.relative_path.trim().replace('\\', "/"),
                    target_path: file.target_path.trim().to_string(),
                    skip_install: file.skip_install.unwrap_or(false),
                    overwrite_existing: file.overwrite_existing.unwrap_or(false),
                })
                .collect::<Vec<_>>()
        });

        let import_result = import_mod_into_database(
            &paths.database_path,
            &gameId,
            &game.game_type,
            Path::new(&game.path),
            &target_dir,
            Some(source_name),
            file_overrides.as_deref(),
        );

        let mod_id = match import_result {
            Ok(mod_id) => mod_id,
            Err(error) => {
                let _ = fs::remove_dir_all(&target_dir);
                return Err(error);
            }
        };

        let install_plan = load_mod_install_plan(&paths.database_path, &mod_id)?
            .ok_or_else(|| "导入后的 Mod 安装计划不存在".to_string())?;
        let overwrite_targets = file_overrides
            .as_ref()
            .map(|files| {
                files
                    .iter()
                    .filter(|file| file.overwrite_existing)
                    .map(|file| file.target_path.clone())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        if let Err(error) = create_mod_symlinks(
            Path::new(&game.path),
            &install_plan.mod_id,
            Path::new(&install_plan.source_dir),
            &install_plan.files,
            &overwrite_targets,
        ) {
            let _ = remove_mod_symlinks(
                Path::new(&game.path),
                &install_plan.mod_id,
                Path::new(&install_plan.source_dir),
                &install_plan.files,
            );
            let _ = delete_mod_by_id(&paths.database_path, &mod_id);
            let _ = fs::remove_dir_all(&target_dir);
            return Err(error);
        }

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn install_game_prerequisite_module(
    app: AppHandle,
    gameId: String,
    prerequisiteKey: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game = load_stored_game_by_id(&paths.database_path, &gameId)?
            .ok_or_else(|| "未找到要安装前置组件的游戏".to_string())?;

        install_game_prerequisite(
            &paths.app_dir,
            Path::new(&game.path),
            &game.game_type,
            &prerequisiteKey,
        )?;

        bootstrap_app_payload(&app)
    })
}
