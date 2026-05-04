// connect.rs
use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use crate::commands::session::{ACTIVE_SESSIONS, FILE_TRANSFER_SENDERS, FILE_TRANSFER_SESSIONS, SESSION_SENDERS};
use crate::commands::session::codecs::apply_cached_browser_supported_codecs;
use crate::session_handler::TauriHandler;
use librustdesk::ui_session_interface::{Session, io_loop};
use librustdesk::client::Data;
use scrap::CodecFormat;
use hbb_common::log;

fn tune_tauri_remote_codecs(session: &Session<TauriHandler>) {
    let mut lc = session.lc.write().unwrap();
    if !lc.mark_unsupported.contains(&CodecFormat::AV1) {
        lc.mark_unsupported.push(CodecFormat::AV1);
    }
    if !lc.mark_unsupported.contains(&CodecFormat::VP9) {
        lc.mark_unsupported.push(CodecFormat::VP9);
    }
    if !lc.mark_unsupported.contains(&CodecFormat::H265) {
        lc.mark_unsupported.push(CodecFormat::H265);
    }
}

#[tauri::command]
pub async fn connect_to_peer(app: AppHandle, id: String, password: Option<String>) -> Result<(), String> {
    let id = id.trim().to_string();
    let window_label = format!("session_window_{}", id.replace("-", "_").replace(".", "_"));

    if let Some(window) = app.get_webview_window(&window_label) {
        let _ = window.set_focus();
        return Ok(());
    }

    // Move core initialization to a dedicated thread to avoid Tokio runtime conflict
    let app_clone = app.clone();
    let id_clone = id.clone();
    let pwd_clone = password.unwrap_or_default();
    
    std::thread::spawn(move || {
        let handler = TauriHandler::new(Some(app_clone.clone()), id_clone.clone());
        let session_url = format!("/#/session/{}", id_clone);

        // UI Creation is usually OK on main/tokio, but let's keep it here or dispatch back
        let _ = WebviewWindowBuilder::new(&app_clone, window_label, tauri::WebviewUrl::App(session_url.into()))
            .title(format!("RustDesk - {}", id_clone))
            .inner_size(1024.0, 768.0)
            .build();

        let session: Session<TauriHandler> = Session {
            password: pwd_clone,
            ui_handler: handler,
            ..Default::default()
        };

        // This call is the one that often panics if called inside Tokio
        session.lc.write().unwrap().initialize(
            id_clone.clone(), 
            hbb_common::rendezvous_proto::ConnType::DEFAULT_CONN, 
            None, false, None, None, None
        );
        tune_tauri_remote_codecs(&session);

        let s_clone = session.clone();
        let i_clone = id_clone.clone();
        ACTIVE_SESSIONS.lock().unwrap().insert(i_clone.clone(), s_clone.clone());
        apply_cached_browser_supported_codecs(&i_clone, &s_clone);

        // Setup sender observer
        let s_obs = s_clone.clone();
        let i_obs = i_clone.clone();
        std::thread::spawn(move || {
            for _ in 0..100 {
                if let Some(tx) = s_obs.sender.read().unwrap().as_ref() {
                    SESSION_SENDERS.lock().unwrap().insert(i_obs.clone(), tx.clone());
                    apply_cached_browser_supported_codecs(&i_obs, &s_obs);
                    return;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
        });

        log::info!("[Tauri] Starting DEFAULT_CONN io_loop for {}", i_clone);
        io_loop(s_clone, 0);
        
        ACTIVE_SESSIONS.lock().unwrap().remove(&i_clone);
        SESSION_SENDERS.lock().unwrap().remove(&i_clone);
    });

    Ok(())
}

#[tauri::command]
pub async fn fs_connect(
    app: AppHandle,
    id: String,
    password: Option<String>,
    conn_token: Option<String>,
) -> Result<(), String> {
    let id = id.trim().to_string();
    
    {
        let sessions = FILE_TRANSFER_SESSIONS.lock().unwrap();
        if sessions.contains_key(&id) {
            return Ok(());
        }
    }

    let app_clone = app.clone();
    let id_clone = id.clone();
    let pwd_clone = password.unwrap_or_default();
    let conn_token_clone = conn_token.clone();

    // Move everything to a raw thread to bypass Tokio "runtime within runtime" panics
    std::thread::spawn(move || {
        let handler = TauriHandler::new(Some(app_clone.clone()), id_clone.clone());
        let session: Session<TauriHandler> = Session {
            password: pwd_clone,
            ui_handler: handler,
            ..Default::default()
        };
        
        log::info!("[Tauri] Initializing FILE_TRANSFER session for {}", id_clone);
        // initialize() must NOT be called inside a Tokio worker thread
        session.lc.write().unwrap().initialize(
            id_clone.clone(), 
            hbb_common::rendezvous_proto::ConnType::FILE_TRANSFER, 
            None, false, None, None, conn_token_clone
        );

        let s_clone = session.clone();
        let i_clone = id_clone.clone();
        FILE_TRANSFER_SESSIONS.lock().unwrap().insert(i_clone.clone(), s_clone.clone());

        let s_obs = s_clone.clone();
        let i_obs = i_clone.clone();
        std::thread::spawn(move || {
            for _ in 0..100 {
                if let Some(tx) = s_obs.sender.read().unwrap().as_ref() {
                    FILE_TRANSFER_SENDERS.lock().unwrap().insert(i_obs.clone(), tx.clone());
                    return;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
        });

        log::info!("[Tauri] Starting FILE_TRANSFER io_loop for {}", i_clone);
        let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            io_loop(s_clone, 0);
        }));
        
        log::info!("[Tauri] FILE_TRANSFER io_loop exited for {}. Result: {:?}", i_clone, res.is_ok());
        
        FILE_TRANSFER_SESSIONS.lock().unwrap().remove(&i_clone);
        FILE_TRANSFER_SENDERS.lock().unwrap().remove(&i_clone);
    });

    Ok(())
}

#[tauri::command]
pub async fn get_session_conn_token(id: String) -> Result<Option<String>, String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().map_err(|e| e.to_string())?;
    Ok(sessions.get(&id).and_then(|session| session.get_conn_token()))
}

#[tauri::command]
pub async fn submit_password(id: String, password: String) -> Result<(), String> {
    let id = id.trim().to_string();
    log::debug!("[Tauri Auth] Submitting password for peer: '{}'", id);
    let mut sent = false;

    // File transfer can run alongside the default remote-control session with
    // the same peer id. If a file-transfer login prompt is active, the password
    // must reach that sender too.
    {
        let senders = FILE_TRANSFER_SENDERS.lock().unwrap();
        if let Some(tx) = senders.get(&id) {
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password.clone(), true))) {
                return Err(format!("Failed to send file-transfer login data: {}", e));
            }
            sent = true;
        }
    }

    {
        let senders = SESSION_SENDERS.lock().unwrap();
        if let Some(tx) = senders.get(&id) {
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password.clone(), true))) {
                return Err(format!("Failed to send login data: {}", e));
            }
            sent = true;
        }
    }

    if sent {
        return Ok(());
    }

    let file_session_opt = {
        let sessions = FILE_TRANSFER_SESSIONS.lock().unwrap();
        sessions.get(&id).cloned()
    };

    if let Some(session) = file_session_opt {
        if let Some(tx) = session.sender.read().unwrap().as_ref() {
            FILE_TRANSFER_SENDERS.lock().unwrap().insert(id.clone(), tx.clone());
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password.clone(), true))) {
                return Err(format!("Failed to send file-transfer login data: {}", e));
            }
            sent = true;
        }
    }

    let session_opt = {
        let sessions = ACTIVE_SESSIONS.lock().unwrap();
        sessions.get(&id).cloned()
    };

    if let Some(session) = session_opt {
        if let Some(tx) = session.sender.read().unwrap().as_ref() {
            SESSION_SENDERS.lock().unwrap().insert(id.clone(), tx.clone());
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password.clone(), true))) {
                return Err(format!("Failed to send login data: {}", e));
            }
            sent = true;
        }
    }

    if sent {
        Ok(())
    } else {
        Err(format!("No active session found for peer '{}'", id))
    }
}

#[tauri::command]
pub async fn is_session_connected(id: String) -> Result<bool, String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        return Ok(session.ui_handler.is_connected());
    }
    Ok(false)
}
