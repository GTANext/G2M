#[path = "game/index.rs"]
mod game;

use game::{
    cancel_download, check_duplicate_directory, check_game_directories, check_mod_loaders,
    copy_game_image, copy_image_to_custom_dir, delete_custom_prerequisite, delete_game,
    detect_game, download_game, extract_game, get_custom_prerequisites, get_download_records,
    get_extract_records, get_game_by_id, get_games, install_custom_prerequisite,
    install_mod_prerequisites, launch_game, mark_mod_loader_manual, open_game_folder,
    process_image_upload, save_base64_image, save_game, select_custom_prerequisite_files,
    select_extract_folder, select_game_folder, select_image_file, select_mod_loader_file,
    unmark_mod_loader_manual, update_game,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> () {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            select_game_folder,
            detect_game,
            save_game,
            get_games,
            get_game_by_id,
            update_game,
            delete_game,
            check_duplicate_directory,
            copy_game_image,
            select_image_file,
            process_image_upload,
            save_base64_image,
            copy_image_to_custom_dir,
            launch_game,
            open_game_folder,
            check_mod_loaders,
            install_mod_prerequisites,
            select_mod_loader_file,
            mark_mod_loader_manual,
            unmark_mod_loader_manual,
            install_custom_prerequisite,
            get_custom_prerequisites,
            delete_custom_prerequisite,
            select_custom_prerequisite_files,
            check_game_directories,
            download_game,
            cancel_download,
            extract_game,
            get_download_records,
            get_extract_records,
            select_extract_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
