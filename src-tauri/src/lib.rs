use serde::Serialize;

mod commands;
mod game_prerequisites;
mod game_repository;
mod game_support;
mod mod_import;
mod mod_repository;
mod models;
mod repository;
mod storage;
mod symlink_install;
mod utils;
mod workspace_package;

use commands::{
    bootstrap_app, delete_game_entry, delete_mod_entry, detect_game_directory,
    generate_manifest_file, import_mod_directory, inspect_mod_source, inspect_mod_source_digest,
    get_app_info, install_game_prerequisite_module, preview_mod_directory,
    save_game_path, update_game_entry, update_mod_enabled,
};

pub(crate) use game_support::{canonical_exe_name, canonical_game_name};
pub(crate) use models::{
    AppInfoPayload, BootstrapPayload, DetectedGamePayload, ExistingBuilderManifestFilePayload,
    ExistingBuilderManifestLinkPayload, ExistingBuilderManifestPayload,
    ExistingBuilderManifestUpdatePayload, GameDirectory, GamePrerequisitePayload, LegacySettingsFile,
    ManifestSourceDigestPayload, ModImportFileEntryInput, ModImportFileEntryPayload,
    ModImportPreviewPayload, ModInstallFileRecord, ModInstallPlan, StoredConflictFile,
    StoredGameEntry, StoredMod,
};
pub(crate) use repository::{
    initialize_database, insert_game_entry, load_preview_conflict_files, load_stored_game_by_id,
    migrate_legacy_settings_to_database,
};
pub(crate) use storage::game_workspace_package_path;
pub(crate) use symlink_install::remove_path_if_exists;
pub(crate) use utils::{
    build_game_scoped_storage_path, build_mod_id, current_timestamp,
    format_symlink_creation_error, infer_target_folder_from_target_path, normalize_import_target_path,
    paths_equal, random_suffix, resolve_game_scoped_path, resolve_game_target_path,
    system_time_to_timestamp, GAME_WORKSPACE_PACKAGE_FILE_NAME, GAME_WORKSPACE_PACKAGE_VERSION,
};
pub(crate) use workspace_package::ensure_game_workspace_package_path;

type CommandResponse<T> = Result<ApiResponse<T>, String>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse<T> {
    code: i32,
    message: String,
    data: Option<T>,
}

fn ok_response<T>(data: T) -> ApiResponse<T> {
    ApiResponse {
        code: 0,
        message: "ok".to_string(),
        data: Some(data),
    }
}

fn error_response(message: impl Into<String>) -> String {
    let payload = ApiResponse::<()> {
        code: -1,
        message: message.into(),
        data: None,
    };

    serde_json::to_string(&payload)
        .unwrap_or_else(|_| "{\"code\":-1,\"message\":\"unknown error\",\"data\":null}".to_string())
}

fn wrap_command<T, F>(operation: F) -> CommandResponse<T>
where
    T: Serialize,
    F: FnOnce() -> Result<T, String>,
{
    operation().map(ok_response).map_err(error_response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_app,
            get_app_info,
            detect_game_directory,
            generate_manifest_file,
            inspect_mod_source_digest,
            save_game_path,
            update_game_entry,
            delete_game_entry,
            delete_mod_entry,
            update_mod_enabled,
            inspect_mod_source,
            preview_mod_directory,
            import_mod_directory,
            install_game_prerequisite_module
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
