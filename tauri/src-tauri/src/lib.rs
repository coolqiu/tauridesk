use serde::Serialize;

#[derive(Serialize)]
struct ConnectResult {
  success: bool,
  message: Option<String>,
}

use tauri::WebviewUrl;

#[tauri::command]
fn get_id() -> String {
  librustdesk::ipc::get_id()
}

#[tauri::command]
fn connect(
  app_handle: tauri::AppHandle,
  remote_id: String,
  password: Option<String>,
  is_file_transfer: Option<bool>,
  is_view_camera: Option<bool>,
  is_terminal: Option<bool>,
  force_relay: Option<bool>,
) -> ConnectResult {
  // For now, we just trigger opening a new window with the connection
  // The actual connection logic will be handled by the new window
  // For packaged app, we need to point to index.html with hash routing
  let url = format!("../index.html#/remote?id={}&password={}&is_file_transfer={}&is_view_camera={}&is_terminal={}&force_relay={}",
    remote_id,
    password.unwrap_or_default(),
    is_file_transfer.unwrap_or(false),
    is_view_camera.unwrap_or(false),
    is_terminal.unwrap_or(false),
    force_relay.unwrap_or(false),
  );

  tauri::webview::WebviewWindowBuilder::new(
    &app_handle,
    format!("RustDesk - {}", remote_id),
    WebviewUrl::App(url.into()),
  )
  .title(format!("RustDesk - {}", remote_id))
  .build()
  .map(|_| ConnectResult { success: true, message: None })
  .unwrap_or_else(|e| ConnectResult {
    success: false,
    message: Some(format!("{}", e)),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .invoke_handler(tauri::generate_handler![get_id, connect])
    .setup(|_app| {
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
