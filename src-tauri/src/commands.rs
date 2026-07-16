const APP_VERSION: &str = "v0.0.1-alpha1";

use std::{
    fs,
    path::{Path, PathBuf},
    process::Command as ProcessCommand,
};

#[cfg(target_family = "windows")]
use std::os::windows::ffi::OsStrExt;

use serde::Deserialize;
use tauri::AppHandle;

#[cfg(target_family = "windows")]
use windows_sys::Win32::Storage::FileSystem::{
    GetFileAttributesW, SetFileAttributesW, FILE_ATTRIBUTE_HIDDEN, INVALID_FILE_ATTRIBUTES,
};

use crate::{
    AppInfoPayload,
    command_support::{
        load_required_game, load_required_mod_install_plan, normalize_optional_string, resolve_game_image,
        resolve_import_display_name, resolve_updated_game_image,
        set_mod_symlinks_enabled,
    },
    game_prerequisites::{
        detect_game_prerequisite_payloads, detect_game_prerequisites, install_game_prerequisite,
        repair_game_prerequisites, resolve_prerequisite_asi_conflict, uninstall_game_prerequisite,
    },
    game_support::{
        canonical_game_name, default_game_name,
        detect_game_installation, normalize_game_type,
    },
    mod_import::{
        build_mod_import_preview, build_mod_source_preview, copy_directory_recursive,
        import_mod_into_database, inspect_mod_source_digest_payload, prepare_import_source,
        resolve_import_source,
        unique_directory_path, ImportFileOverride,
    },
    repository::{
        delete_game_entry_from_database, delete_mod_by_id, delete_mods_for_game,
        load_game_directories, load_mod_install_plan, load_mods,
        load_stored_games, update_game_entry_in_database, update_mod_enabled_in_database,
        update_mod_name_in_database,
    },
    storage::{ensure_game_workspace, ensure_game_workspaces, ensure_storage},
    symlink_install::{
        count_missing_mod_targets,
        cleanup_legacy_mod_root_symlinks,
        remove_path_if_exists,
    },
    utils::{current_timestamp, is_process_elevated, paths_equal},
    workspace_package::{import_game_packages_into_database, sync_game_packages},
    wrap_command, BootstrapPayload, CommandResponse, DetectedGamePayload, GameDirectory,
    GameLinkHealthPayload, StoredMod,
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
            version: format!("{APP_VERSION}"),
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
        .map(|game| detect_game_prerequisites(&paths, game))
        .collect::<Vec<_>>();
    sync_game_packages(&paths.database_path, &games)?;
    let mods = load_mods(&paths.database_path)?;
    let games = games
        .into_iter()
        .map(|mut game| {
            game.link_health = inspect_game_link_health(&paths.database_path, &game, &mods)?;
            Ok(game)
        })
        .collect::<Result<Vec<_>, String>>()?;

    for mod_entry in mods.iter().filter(|mod_entry| mod_entry.enabled) {
        let Some(install_plan) = load_mod_install_plan(&paths.database_path, &mod_entry.id)? else {
            continue;
        };

        let _ = cleanup_legacy_mod_root_symlinks(
            Path::new(&install_plan.game_path),
            Path::new(&install_plan.source_dir),
            &install_plan.files,
        );
    }

    Ok(BootstrapPayload {
        data_dir: paths.assets_dir.to_string_lossy().to_string(),
        database_path: paths.database_path.to_string_lossy().to_string(),
        is_elevated: is_process_elevated(),
        games,
        mods,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriConfigInfo {
    product_name: String,
}

fn load_tauri_config_info() -> Result<TauriConfigInfo, String> {
    serde_json::from_str::<TauriConfigInfo>(include_str!("../tauri.conf.json"))
        .map_err(|error| format!("failed to parse tauri.conf.json: {error}"))
}

fn inspect_game_link_health(
    database_path: &Path,
    game: &GameDirectory,
    mods: &[StoredMod],
) -> Result<GameLinkHealthPayload, String> {
    if game.path.trim().is_empty() {
        return Ok(GameLinkHealthPayload::default());
    }

    let enabled_mods = mods
        .iter()
        .filter(|mod_entry| mod_entry.enabled && mod_entry.game_id == game.id)
        .collect::<Vec<_>>();

    if enabled_mods.is_empty() {
        return Ok(GameLinkHealthPayload::default());
    }

    let mut issue_count = 0_i64;
    let mut missing_source_count = 0_i64;
    let mut missing_target_count = 0_i64;
    let mut repairable_mod_count = 0_i64;

    for mod_entry in enabled_mods {
        let Some(install_plan) = load_mod_install_plan(database_path, &mod_entry.id)? else {
            issue_count += 1;
            missing_source_count += 1;
            continue;
        };

        if !Path::new(&install_plan.source_dir).exists() {
            issue_count += 1;
            missing_source_count += 1;
            continue;
        }

        let missing_targets = count_missing_mod_targets(
            Path::new(&game.path),
            Path::new(&install_plan.source_dir),
            &install_plan.files,
        )?;
        if missing_targets > 0 {
            issue_count += 1;
            missing_target_count += missing_targets;
            repairable_mod_count += 1;
        }
    }

    Ok(GameLinkHealthPayload {
        has_issues: issue_count > 0,
        issue_count,
        missing_source_count,
        missing_target_count,
        repairable_mod_count,
    })
}

fn hide_workspace_mod_directory_if_needed(path: &Path, should_hide: bool) -> Result<(), String> {
    if !should_hide {
        return Ok(());
    }

    #[cfg(target_family = "windows")]
    {
        let encoded_path = path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<u16>>();
        let attributes = unsafe { GetFileAttributesW(encoded_path.as_ptr()) };
        if attributes == INVALID_FILE_ATTRIBUTES {
            return Err(format!("failed to inspect workspace mod directory attributes: {}", path.display()));
        }

        if attributes & FILE_ATTRIBUTE_HIDDEN != 0 {
            return Ok(());
        }

        let next_attributes = attributes | FILE_ATTRIBUTE_HIDDEN;
        if unsafe { SetFileAttributesW(encoded_path.as_ptr(), next_attributes) } == 0 {
            return Err(format!("failed to hide workspace mod directory: {}", path.display()));
        }
    }

    Ok(())
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn read_game_folders(path: String) -> CommandResponse<Vec<String>> {
    wrap_command(|| {
        let mut folders = Vec::new();
        if let Ok(entries) = fs::read_dir(Path::new(path.trim())) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_dir() {
                        folders.push(entry.file_name().to_string_lossy().to_string());
                    }
                }
            }
        }
        folders.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        Ok(folders)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn launch_game_executable(
    app: AppHandle,
    gameId: String,
) -> CommandResponse<String> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game = load_required_game(&paths.database_path, &gameId, "未找到要启动的游戏")?;
        let game_path = Path::new(&game.path);
        let executable_path = resolve_game_executable_path(game_path, &game.exe_name)?;

        ProcessCommand::new(&executable_path)
            .current_dir(game_path)
            .spawn()
            .map_err(|error| {
                format!(
                    "failed to launch game executable {}: {error}",
                    executable_path.display()
                )
            })?;

        Ok(executable_path.to_string_lossy().to_string())
    })
}

fn resolve_game_executable_path(game_path: &Path, exe_name: &str) -> Result<PathBuf, String> {
    let normalized_exe_name = exe_name.trim();
    if normalized_exe_name.is_empty() {
        return Err("当前游戏未配置可启动的 EXE".to_string());
    }

    let executable_path = Path::new(normalized_exe_name);
    let resolved_path = if executable_path.is_absolute() {
        executable_path.to_path_buf()
    } else {
        game_path.join(executable_path)
    };

    if resolved_path.is_file() {
        return Ok(resolved_path);
    }

    Err(format!("未找到游戏启动文件: {}", resolved_path.display()))
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

        let mut detected_game = detect_game_installation(Path::new(normalized_path), &existing_games)?;
        let mut cover_base64 = None;

        if let Ok(Some(package)) = crate::workspace_package::read_game_workspace_package(
            &crate::game_workspace_package_path(Path::new(normalized_path)),
        ) {
            detected_game.name = package.name;
            detected_game.game_type = package.game_type;
            cover_base64 = package.cover_base64;
        }

        Ok(DetectedGamePayload {
            game_type: detected_game.game_type,
            name: detected_game.name,
            path: detected_game.path,
            exe_name: detected_game.exe_name,
            version: detected_game.version,
            cover_base64,
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
            "directory" => Path::new(source_path).join("modx.json"),
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

        fs::write(&target_path, manifestContent.trim())
            .map_err(|error| format!("failed to write manifest: {error}"))?;

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
    exeName: Option<String>,
    coverImageSourcePath: Option<String>,
    existingCoverBase64: Option<String>,
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
        let resolved_exe_name = normalize_optional_string(exeName);
        if !resolved_exe_name.is_empty() {
            detected_game.exe_name = resolved_exe_name;
        }
        detected_game.version = normalize_optional_string(version);
        detected_game.image_path =
            resolve_game_image(coverImageSourcePath.as_deref(), existingCoverBase64)?;
        detected_game.created_at = current_timestamp();
        detected_game.updated_at = detected_game.created_at;

        crate::insert_game_entry(&paths.database_path, &detected_game)?;
        ensure_game_workspace(Path::new(normalized_path))?;
        crate::workspace_package::update_game_workspace_package_info(
            Path::new(normalized_path),
            &detected_game.name,
            &detected_game.game_type,
            &detected_game.image_path,
        )?;

        bootstrap_app_payload(&app)
    })
}

#[tauri::command]
pub(crate) fn read_image_base64(path: String) -> CommandResponse<String> {
    wrap_command(|| {
        crate::game_support::read_image_as_base64(&path)
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
    exeName: Option<String>,
    coverImageSourcePath: Option<String>,
    existingCoverBase64: Option<String>,
    useDefaultImage: bool,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let normalized_game_type = normalize_game_type(&gameType)?;
        let normalized_name = name.trim();
        let existing_game =
            load_required_game(&paths.database_path, &gameId, "未找到要编辑的游戏")?;
        let resolved_name = if normalized_name.is_empty() {
            canonical_game_name(normalized_game_type).to_string()
        } else {
            normalized_name.to_string()
        };
        let resolved_exe_name = {
            let normalized = normalize_optional_string(exeName);
            if normalized.is_empty() {
                if existing_game.game_type == normalized_game_type {
                    existing_game.exe_name.clone()
                } else {
                    crate::canonical_exe_name(normalized_game_type).to_string()
                }
            } else {
                normalized
            }
        };
        let resolved_version = normalize_optional_string(version);
        let next_image_path = resolve_updated_game_image(
            &existing_game,
            coverImageSourcePath.as_deref(),
            existingCoverBase64,
            useDefaultImage,
        )?;

        let updated_rows = update_game_entry_in_database(
            &paths.database_path,
            &gameId,
            normalized_game_type,
            &resolved_name,
            &resolved_exe_name,
            &resolved_version,
            &next_image_path,
            current_timestamp(),
        )?;

        if updated_rows == 0 {
            return Err("未找到要编辑的游戏".to_string());
        }
        crate::workspace_package::update_game_workspace_package_info(
            Path::new(&existing_game.path),
            &resolved_name,
            normalized_game_type,
            &next_image_path,
        )?;

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
        let _existing_game =
            load_required_game(&paths.database_path, &gameId, "未找到要删除的游戏")?;
        delete_mods_for_game(&paths.database_path, &gameId)?;
        let deleted_rows = delete_game_entry_from_database(&paths.database_path, &gameId)?;

        if deleted_rows == 0 {
            return Err("未找到要删除的游戏".to_string());
        }

        bootstrap_app_payload(&app)
    })
}

#[derive(serde::Deserialize)]
pub(crate) struct GameSortOrder {
    pub(crate) id: String,
    pub(crate) sort_order: i64,
}

#[tauri::command]
#[allow(non_snake_case)]
pub(crate) fn update_games_sort_order(
    app: AppHandle,
    orders: Vec<GameSortOrder>,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let connection = rusqlite::Connection::open(&paths.database_path)
            .map_err(|error| format!("failed to open database: {error}"))?;

        for order in orders {
            connection
                .execute(
                    "UPDATE games SET sort_order = ?1 WHERE id = ?2",
                    rusqlite::params![order.sort_order, order.id],
                )
                .map_err(|error| format!("failed to update sort order: {error}"))?;
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
        let install_plan =
            load_required_mod_install_plan(&paths.database_path, &modId, "未找到要删除的 Mod")?;

        set_mod_symlinks_enabled(&install_plan, false, &[])?;
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
        let install_plan =
            load_required_mod_install_plan(&paths.database_path, &modId, "未找到要更新的 Mod")?;

        set_mod_symlinks_enabled(&install_plan, enabled, &[])?;

        let updated_rows = update_mod_enabled_in_database(&paths.database_path, &modId, enabled)?;

        if updated_rows == 0 {
            return Err("未找到要更新的 Mod".to_string());
        }

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn update_mod_name(
    app: AppHandle,
    modId: String,
    modName: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let normalized_name = modName.trim().to_string();
        if normalized_name.is_empty() {
            return Err("Mod 名称不能为空".to_string());
        }

        let paths = ensure_storage(&app)?;
        let updated_rows =
            update_mod_name_in_database(&paths.database_path, &modId, &normalized_name)?;

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
        
        let mod_name_override =
            resolve_import_display_name(modName.as_deref(), source.display_name.as_str())?;

        build_mod_import_preview(
            &paths.database_path,
            &gameId,
            &game.game_type,
            &source,
            Some(mod_name_override.as_str()),
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
        let mod_name_override =
            resolve_import_display_name(modName.as_deref(), source.display_name.as_str())?;

        build_mod_source_preview(&source, Some(mod_name_override.as_str()))
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

        let workspace_mods_dir = Path::new(&game.path)
            .join(crate::GAME_WORKSPACE_DIR_NAME)
            .join("mods");
        fs::create_dir_all(&workspace_mods_dir)
            .map_err(|error| format!("failed to create workspace mods directory: {error}"))?;

        let source_name =
            resolve_import_display_name(modName.as_deref(), source.display_name.as_str())?;
        let target_dir = unique_directory_path(&workspace_mods_dir, &source_name);

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
            source.original_is_zip,
            source.original_zip_path.as_deref(),
            Some(source_name.as_str()),
            file_overrides.as_deref(),
        );

        let mod_id = match import_result {
            Ok(mod_id) => mod_id,
            Err(error) => {
                let _ = fs::remove_dir_all(&target_dir);
                return Err(error);
            }
        };

        let install_plan = load_required_mod_install_plan(
            &paths.database_path,
            &mod_id,
            "导入后的 Mod 安装计划不存在",
        )?;
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
        if let Err(error) = set_mod_symlinks_enabled(&install_plan, true, &overwrite_targets) {
            let _ = set_mod_symlinks_enabled(&install_plan, false, &[]);
            let _ = delete_mod_by_id(&paths.database_path, &mod_id);
            let _ = fs::remove_dir_all(&target_dir);
            return Err(error);
        }
        let _ = hide_workspace_mod_directory_if_needed(&target_dir, source.original_is_zip);

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
        let game =
            load_required_game(&paths.database_path, &gameId, "未找到要安装前置组件的游戏")?;

        install_game_prerequisite(
            &paths,
            Path::new(&game.path),
            &game.game_type,
            &prerequisiteKey,
        )?;

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn install_all_game_prerequisites(
    app: AppHandle,
    gameId: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game =
            load_required_game(&paths.database_path, &gameId, "未找到要安装前置组件的游戏")?;

        let game_path = Path::new(&game.path);
        let game_type = &game.game_type;
        let missing_keys = detect_game_prerequisite_payloads(&paths, game_path, game_type)
            .into_iter()
            .filter(|prerequisite| prerequisite.can_install && !prerequisite.detected)
            .map(|prerequisite| prerequisite.key)
            .collect::<Vec<_>>();

        for prerequisite_key in missing_keys {
            let _ = install_game_prerequisite(
                &paths,
                game_path,
                game_type,
                &prerequisite_key,
            );
        }

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn uninstall_game_prerequisite_module(
    app: AppHandle,
    gameId: String,
    prerequisiteKey: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game =
            load_required_game(&paths.database_path, &gameId, "未找到要卸载前置组件的游戏")?;

        uninstall_game_prerequisite(
            &paths,
            Path::new(&game.path),
            &game.game_type,
            &prerequisiteKey,
        )?;

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn repair_game_symlinks(
    app: AppHandle,
    gameId: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game = load_required_game(&paths.database_path, &gameId, "未找到要修复链接的游戏")?;
        let enabled_mods = load_mods(&paths.database_path)?
            .into_iter()
            .filter(|mod_entry| mod_entry.enabled && mod_entry.game_id == gameId)
            .collect::<Vec<_>>();

        repair_game_prerequisites(&paths, Path::new(&game.path), &game.game_type)?;

        let mut failed_mods = Vec::new();
        for mod_entry in enabled_mods {
            let Some(install_plan) = load_mod_install_plan(&paths.database_path, &mod_entry.id)? else {
                failed_mods.push(format!("{}（缺少安装计划）", mod_entry.name));
                continue;
            };
            if !Path::new(&install_plan.source_dir).exists() {
                failed_mods.push(format!("{}（源目录不存在）", mod_entry.name));
                continue;
            }

            let overwrite_targets = install_plan
                .files
                .iter()
                .map(|file| file.target_path.clone())
                .collect::<Vec<_>>();
            if let Err(error) = set_mod_symlinks_enabled(&install_plan, true, &overwrite_targets) {
                failed_mods.push(format!("{}（{error}）", mod_entry.name));
            }
        }

        if !failed_mods.is_empty() {
            return Err(format!(
                "以下 Mod 的软链接修复失败，请确认游戏目录和 .g2m 工作区是否完整：{}",
                failed_mods.join("；")
            ));
        }

        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn resolve_prerequisite_conflict(
    app: AppHandle,
    gameId: String,
    prerequisiteKey: String,
) -> CommandResponse<BootstrapPayload> {
    wrap_command(|| {
        let paths = ensure_storage(&app)?;
        let game = load_required_game(&paths.database_path, &gameId, "未找到要处理前置组件冲突的游戏")?;
        resolve_prerequisite_asi_conflict(
            &paths,
            Path::new(&game.path),
            &game.game_type,
            &prerequisiteKey,
        )?;
        bootstrap_app_payload(&app)
    })
}

#[allow(non_snake_case)]
#[tauri::command]
pub(crate) fn build_mod_archive(
    sourcePath: String,
    sourceType: String,
    manifestContent: String,
    outputPath: String,
) -> CommandResponse<String> {
    wrap_command(|| {
        let source_path = sourcePath.trim();
        let output_path = outputPath.trim();
        if source_path.is_empty() || output_path.is_empty() {
            return Err("source or output path is empty".to_string());
        }

        crate::mod_import::build_mod_archive(
            Path::new(source_path),
            sourceType.trim(),
            &manifestContent,
            Path::new(output_path),
        )
    })
}
