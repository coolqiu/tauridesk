// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  if std::env::args().any(|arg| arg == "--check-hwcodec-config") {
    std::env::set_var("RUSTDESK_IS_TAURI", "1");
    *hbb_common::config::APP_NAME.write().unwrap() = "RustDesk_Tauri".to_owned();
    librustdesk::ipc::hwcodec_process();
    return;
  }

  app_lib::run();
}
