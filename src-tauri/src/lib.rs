mod game_manager;

use game_manager::{select_game_folder, detect_game, save_game, get_games, get_game_by_id, update_game, check_duplicate_directory};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            check_duplicate_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
