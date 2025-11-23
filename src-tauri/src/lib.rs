#[path = "game/index.rs"]
mod game;

#[path = "mod/mod.rs"]
mod mod_core;

// 从 game 模块导入所有函数
use game::core::{
    check_duplicate_directory, copy_game_image, copy_image_to_custom_dir, delete_game,
    get_game_by_id, get_games, install_mod_prerequisites, launch_game, open_game_folder,
    process_image_upload, save_base64_image, save_game, select_image_file, update_game,
};
use game::detection::{detect_game, select_game_folder};
use game::download::{
    cancel_download, download_game, extract_game, get_download_records, get_extract_records,
    select_extract_folder,
};
use game::prerequisites::{
    check_game_directories, check_mod_loaders, delete_custom_prerequisite,
    get_custom_prerequisites, install_custom_prerequisite, mark_mod_loader_manual,
    select_custom_prerequisite_files, select_mod_loader_file, unmark_mod_loader_manual,
};

use mod_core::{install_user_mod, read_g2m_mod_config, save_g2m_mod_config, select_mod_directory, select_mod_files};

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
            select_extract_folder,
            install_user_mod,
            save_g2m_mod_config,
            read_g2m_mod_config,
            select_mod_directory,
            select_mod_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
