// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    g2m_lib::startup_checks::perform_startup_checks();
    g2m_lib::run()
}
