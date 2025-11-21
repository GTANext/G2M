#[path = "game/index.rs"]
mod game;

use game::{
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
    download_game,
    extract_game,
    get_download_records,
    get_extract_records,
    select_extract_folder
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
            download_game,
            extract_game,
            get_download_records,
            get_extract_records,
            select_extract_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
