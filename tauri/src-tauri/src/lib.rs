// lib.rs
mod commands;
mod session_handler;
mod dummy_cm;

use tauri::{Manager, Emitter, WebviewWindowBuilder};
use std::sync::{Mutex};
use std::collections::HashMap;

type VideoChannelMap = HashMap<String, (tauri::ipc::Channel, u64)>;

lazy_static::lazy_static! {
    pub static ref CONN_TO_PEER_MAP: Mutex<HashMap<i32, String>> = Mutex::new(HashMap::new());
    pub static ref VIDEO_CHANNELS: Mutex<VideoChannelMap> = Mutex::new(HashMap::new());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Authorization Success
            let handle_auth = handle.clone();
            *librustdesk::ui_interface::ON_AUTH_SUCCESS.lock().unwrap() = Some(Box::new(move |id| {
                println!("✅ [Tauri Bridge] Connection authorized: {}.", id);
                let mut peer_id = String::new();
                if let Ok(map) = CONN_TO_PEER_MAP.lock() {
                    if let Some(p) = map.get(&id) {
                        peer_id = p.clone();
                    }
                }
                if peer_id.is_empty() {
                    if let Ok(sessions) = crate::commands::session::ACTIVE_SESSIONS.lock() {
                        let sessions: &std::collections::HashMap<String, librustdesk::ui_session_interface::Session<crate::session_handler::TauriHandler>> = &*sessions;
                        if sessions.len() == 1 {
                            if let Some(p) = sessions.keys().next() {
                                peer_id = p.clone();
                            }
                        }
                    }
                }
                let payload = serde_json::json!({ "id": id, "peer_id": peer_id });
                let _ = handle_auth.emit("connection-authorized", payload.clone());
                let _ = handle_auth.emit("connection-state-changed", payload);
                let label = format!("authorize_{}", id);
                if let Some(window) = handle_auth.get_webview_window(&label) {
                    let _ = window.close();
                }
            }));

            // Incoming Connection
            let handle_incoming = handle.clone();
            *librustdesk::ui_interface::ON_INCOMING_CONN.lock().unwrap() = Some(Box::new(move |id, name, ip| {
                // IMPORTANT: Use Config::get_id() instead of ipc::get_id() to avoid tokio runtime panics
                let my_id = hbb_common::config::Config::get_id();
                println!("🔍 [Tauri Bridge] Incoming connection request - ID: {}, Name: {}, Peer: {}, MyID: {}", id, name, ip, my_id);
                
                // If it's a self-connection (loopback) for testing, auto-authorize it quietly
                // Check by ID or common loopback IPs
                if (!ip.is_empty() && ip == my_id) || ip == "127.0.0.1" || ip == "localhost" || ip == "::1" {
                    let approve_mode = librustdesk::ui_interface::get_option("approve-mode");
                    if approve_mode == "password" {
                        println!("🧪 [Tauri Bridge] SELF-LOOP detected in password mode. Skipping silent authorization.");
                        return;
                    }
                    println!("🧪 [Tauri Bridge] SELF-LOOP detected. Auto-authorizing in separate thread...");
                    std::thread::spawn(move || {
                        // Small delay to ensure core state is ready
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        let mut conns = librustdesk::ui_interface::PENDING_CONNS.lock().unwrap();
                        if let Some(tx) = conns.remove(&id) {
                            println!("✅ [Tauri Bridge] Silent authorization SENT for ID: {}", id);
                            let _ = tx.send(librustdesk::ipc::Data::Authorize {
                                keyboard: true, clipboard: true, audio: true, file: true,
                                restart: false, recording: true, block_input: false,
                            });
                        } else {
                            println!("⚠️ [Tauri Bridge] Self-loop connection {} not found in pending list!", id);
                        }
                    });
                    return;
                }

                println!("🔔 [Tauri Bridge] Incoming connection from: {} ({}) with ID: {}", name, ip, id);
                if let Ok(mut map) = CONN_TO_PEER_MAP.lock() {
                    map.insert(id, ip.clone());
                }
                
                let _ = WebviewWindowBuilder::new(
                    &handle_incoming,
                    format!("authorize_{}", id),
                    tauri::WebviewUrl::App(format!("/#/authorize?id={}&peer_id={}&name={}", id, ip, name).into())
                )
                .title("RustDesk - Incoming Connection")
                .inner_size(400.0, 520.0)
                .resizable(false)
                .always_on_top(true)
                .decorations(true)
                .build();
            }));

            // Cancel Incoming
            let handle_cancel = handle.clone();
            *librustdesk::ui_interface::ON_CANCEL_INCOMING_CONN.lock().unwrap() = Some(Box::new(move |id| {
                println!("🚪 [Tauri Bridge] Incoming connection REJECTED: {}", id);
                let mut peer_id = String::new();
                if let Ok(map) = CONN_TO_PEER_MAP.lock() {
                    if let Some(p) = map.get(&id) {
                        peer_id = p.clone();
                    }
                }
                let _ = handle_cancel.emit("connection-rejected", serde_json::json!({ "id": id, "peer_id": peer_id }));
                let label = format!("authorize_{}", id);
                if let Some(window) = handle_cancel.get_webview_window(&label) {
                    let _ = window.close();
                }
                if let Ok(mut map) = CONN_TO_PEER_MAP.lock() {
                    map.remove(&id);
                }
            }));

            // Process Separation
            let args: Vec<String> = std::env::args().collect();
            let is_child = args.iter().any(|a| a.contains("--connect") || a.contains("--session") || a.starts_with("rustdesk:"));
            
            if !is_child {
                librustdesk::ui_interface::start_option_status_sync();
                std::thread::spawn(|| {
                    println!("🚀 [Core] Performing global_init (Isolated Tauri Mode - MAIN)...");
                    std::env::set_var("RUSTDESK_IS_TAURI", "1");
                    *hbb_common::config::APP_NAME.write().unwrap() = "RustDesk_Tauri".to_owned();
                    librustdesk::common::global_init(); 
                    librustdesk::ui_interface::set_option("no-tray".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_option("stop-service".to_owned(), "N".to_owned());
                    librustdesk::ui_interface::set_option("no-upgrade".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_option("rendezvous-server".to_owned(), "rs-ny.rustdesk.com".to_owned());
                    librustdesk::ui_interface::set_option("voice-call".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_option("allow-remote-config-modification".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_option("enable-hwcodec".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_option("enable-directx-capture".to_owned(), "Y".to_owned());
                    librustdesk::ui_interface::set_local_option("allow-d3d-render".to_owned(), "Y".to_owned());
                    
                    println!("🚀 [Core] Starting CM IPC Server for File Transfer...");
                    std::thread::spawn(|| {
                        let cm = librustdesk::ui_cm_interface::ConnectionManager { ui_handler: crate::dummy_cm::DummyUiCM };
                        librustdesk::ui_cm_interface::start_ipc(cm);
                    });

                    println!("🚀 [Core] Starting Unified Service (Headless Mode)...");
                    librustdesk::start_server(true, false);
                    std::thread::spawn(move || {
                        for _i in 0..20 {
                            std::thread::sleep(std::time::Duration::from_secs(2));
                            let my_id = librustdesk::ipc::get_id();
                            if !my_id.is_empty() {
                                println!("🆔 [Network] My Local ID: {}", my_id);
                                return;
                            }
                        }
                    });
                });
            } else {
                println!("🪟 [Core] Detected Session Child Process. Initializing Identity only.");
                *hbb_common::config::APP_NAME.write().unwrap() = "RustDesk_Tauri".to_owned();
                librustdesk::common::global_init();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::server::get_id,
            commands::server::get_server_state,
            commands::server::get_temporary_password,
            commands::server::refresh_temporary_password,
            commands::server::is_permanent_password_set,
            commands::server::set_permanent_password,
            commands::peers::get_recent_peers,
            commands::peers::get_favorite_peers,
            commands::peers::add_favorite_peer,
            commands::peers::remove_favorite_peer,
            commands::peers::remove_peer,
            commands::settings::get_option,
            commands::settings::set_option,
            commands::settings::get_local_option,
            commands::settings::set_local_option,
            commands::settings::get_settings_batch,
            commands::settings::is_installed,
            commands::system::get_app_info,
            commands::system::get_version,
            commands::session::connect_to_peer,
            commands::session::fs_connect,
            commands::session::get_session_conn_token,
            commands::session::get_pending_msgbox,
            commands::session::submit_password,
            commands::session::close_session,
            commands::session::is_session_connected,
            commands::session::listen_video_stream,
            commands::session::unlisten_video_stream,
            commands::session::force_clear_video_channels,
            commands::session::set_browser_supported_codecs,
            commands::session::refresh_video,
            commands::session::send_mouse_event,
            commands::session::send_mouse_move,
            commands::session::send_wheel,
            commands::session::send_key_event,
            commands::session::send_ctrl_alt_del,
            commands::session::set_remote_option,
            commands::session::switch_display,
            commands::auth::authorize_connection,
            commands::auth::reject_connection,
            commands::clipboard_cmd::send_clipboard_text,
            commands::file_transfer::fs_read_local_dir,
            commands::file_transfer::fs_read_remote_dir,
            commands::file_transfer::fs_get_home_dir,
            commands::file_transfer::open_file_transfer_window,
            commands::file_transfer::fs_transfer_files,
            commands::file_transfer::fs_cancel_job,
            commands::file_transfer::fs_resume_job,
            commands::file_transfer::fs_create_dir,
            commands::file_transfer::fs_remove_file,
            commands::file_transfer::fs_remove_dir_all,
            commands::file_transfer::fs_read_dir_to_remove_recursive,
            commands::file_transfer::fs_remove_all_empty_dirs,
            commands::file_transfer::fs_set_no_confirm,
            commands::file_transfer::fs_confirm_delete_files,
            commands::file_transfer::fs_rename_file,
            commands::file_transfer::fs_confirm_override_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
