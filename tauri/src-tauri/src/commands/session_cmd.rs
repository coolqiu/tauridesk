use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};
use librustdesk::ui_session_interface::Session;
use librustdesk::client::{Data, Interface};
use crate::session_handler::TauriHandler;
use hbb_common::tokio::sync::mpsc::UnboundedSender;

lazy_static::lazy_static! {
    pub static ref SESSION_SENDERS: Arc<Mutex<HashMap<String, UnboundedSender<Data>>>> = Arc::new(Mutex::new(HashMap::new()));
    pub static ref ACTIVE_SESSIONS: Arc<Mutex<HashMap<String, Session<TauriHandler>>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn submit_password(id: String, password: String) -> Result<(), String> {
    let id = id.trim().to_string();
    println!("🔑 [Tauri Auth] Submitting password for peer: '{}' (len: {})", id, id.len());

    // Attempt 1: Check the global sender map
    {
        let senders = SESSION_SENDERS.lock().unwrap();
        if let Some(tx) = senders.get(&id) {
            println!("🚀 [Tauri Auth] Found cached sender for {}, sending LoginData...", id);
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password.clone(), true))) {
                return Err(format!("Failed to send login data: {}", e));
            }
            return Ok(());
        }
    }

    // Attempt 2: Dynamic lookup in ACTIVE_SESSIONS if sender wasn't ready yet
    println!("🔍 [Tauri Auth] Sender not in cache, attempting dynamic lookup for {}...", id);
    let session_opt = {
        let sessions = ACTIVE_SESSIONS.lock().unwrap();
        sessions.get(&id).cloned()
    };

    if let Some(session) = session_opt {
        if let Some(tx) = session.sender.read().unwrap().as_ref() {
            println!("✅ [Tauri Auth] Dynamic lookup SUCCESS for {}. Updating cache.", id);
            // Cache it for future use (like re-auth)
            SESSION_SENDERS.lock().unwrap().insert(id.clone(), tx.clone());
            if let Err(e) = tx.send(Data::Login(("".to_string(), "".to_string(), password, true))) {
                return Err(format!("Failed to send login data: {}", e));
            }
            return Ok(());
        }
    }

    // Attempt 3: Detailed diagnostic failure
    let available_sessions = ACTIVE_SESSIONS.lock().unwrap().keys().cloned().collect::<Vec<_>>();
    println!("❌ [Tauri Auth] No sender or session found for peer '{}'. Available sessions: {:?}", id, available_sessions);
    Err(format!("No active session found for peer '{}'. Connection stack may still be initializing.", id))
}

#[tauri::command]
pub async fn connect_to_peer(app: AppHandle, id: String, password: Option<String>) -> Result<(), String> {
    let id = id.trim().to_string();
    println!("🔌 Received connect request for peer: '{}' (len: {})", id, id.len());

    // Create a new window for this session
    let window_label = format!("session_window_{}", id.replace("-", "_").replace(".", "_"));

    // Check if it's already open
    if let Some(_existing) = app.get_webview_window(&window_label) {
        println!("Window already exists for peer {}", id);
        return Ok(());
    }

    let handler = TauriHandler::new(Some(app.clone()), id.clone());

    // Launch background thread to initialize the remote connection through core
    // In RustDesk this is usually managed by ui::remote::start
    // We are simulating what `ui_interface::new_remote` does but using our TauriHandler
    // This is a complex step, let's start by just opening the window first

    println!("🪟 Spawning new independent window for session: {}", window_label);
    let session_url = format!("/#/session/{}", id);

    match WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App(session_url.into())
    )
    .title(format!("RustDesk - {}", id))
    .inner_size(1024.0, 768.0)
    .build() {
        Ok(_) => {
            println!("✅ Window created successfully.");
        },
        Err(e) => {
            println!("❌ Failed to create window: {:?}", e);
            return Err(format!("Failed to create window: {:?}", e));
        }
    }

    // Initialize Session with TauriHandler
    println!("⚙️  Initializing Session context for {}...", id);
    let session: Session<TauriHandler> = Session {
        password: password.clone().unwrap_or_default(),
        ui_handler: handler,
        server_keyboard_enabled: std::sync::Arc::new(std::sync::RwLock::new(true)),
        server_file_transfer_enabled: std::sync::Arc::new(std::sync::RwLock::new(true)),
        server_clipboard_enabled: std::sync::Arc::new(std::sync::RwLock::new(true)),
        reconnect_count: std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0)),
        ..Default::default()
    };

    session
        .lc
        .write()
        .unwrap()
        .initialize(id.clone(), hbb_common::rendezvous_proto::ConnType::DEFAULT_CONN, None, false, None, None, None);
    println!("✅ Session context initialized for {}.", id);

    // Register the session globally so submit_password can find it
    ACTIVE_SESSIONS.lock().unwrap().insert(id.clone(), session.clone());

    // Start background daemons
    println!("🧵 Spawning observer thread for {}", id);
    let id_for_thread = id.clone();
    let session_for_observer = session.clone();
    std::thread::spawn(move || {
        println!("⏳ Waiting for network stack & sender initialization for {}...", id_for_thread);

        // Wait for core to populate the sender (poll with timeout)
        let mut retry_count = 0;
        loop {
            if let Some(tx) = session_for_observer.sender.read().unwrap().as_ref() {
                println!("🚀 [Tauri Bridge] Session Bridge ESTABLISHED for peer: '{}' after {} retries", id_for_thread, retry_count);
                SESSION_SENDERS.lock().unwrap().insert(id_for_thread.clone(), tx.clone());
                break;
            }
            if retry_count > 100 { // 10 seconds timeout
                println!("⚠️ [Tauri Bridge] Observer loop idle for {}. Dynamic lookup remains active.", id_for_thread);
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
            retry_count += 1;
        }

        println!("🚀 io_loop thread starting for {}", id_for_thread);
        // io_loop is decorated with #[tokio::main], making it synchronous
        let res = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
             librustdesk::ui_session_interface::io_loop(session, 0);
        }));

        // Cleanup after exit
        ACTIVE_SESSIONS.lock().unwrap().remove(&id_for_thread);
        SESSION_SENDERS.lock().unwrap().remove(&id_for_thread);

        match res {
            Ok(_) => println!("🏁 io_loop thread exited NORMALLY for {}", id_for_thread),
            Err(e) => println!("💥 io_loop thread PANICKED for {}: {:?}", id_for_thread, e),
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn listen_video_stream(id: String, channel: tauri::ipc::Channel) {
    let id = id.trim().to_string();
    println!("📡 [Stream] Client subscribing to video stream for peer: {}", id);
    let mut channels = crate::VIDEO_CHANNELS.lock().unwrap();
    
    // Increment nonce or start at 1
    let nonce = channels.get(&id).map(|(_, n)| n + 1).unwrap_or(1);
    println!("🎟️ [Stream] Issued new Nonce v{} for session: {}", nonce, id);
    channels.insert(id, (channel, nonce));
}

#[tauri::command]
pub async fn force_clear_video_channels(id: String) {
    let id = id.trim().to_string();
    println!("🧹 [Stream] FORCE CLEARING all channels for peer: {}", id);
    if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
        channels.remove(&id);
    }
}
#[tauri::command]
pub async fn refresh_video(id: String) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.set_option("refresh".to_owned(), "Y".to_owned());
        println!("⚡ [Stream] Requested video REFRESH for peer: {}", id);
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn unlisten_video_stream(id: String) {
    let id = id.trim().to_string();
    println!("📡 [Stream] Client unsubscribing from video stream for peer: {}", id);
    let mut channels = crate::VIDEO_CHANNELS.lock().unwrap();
    channels.remove(&id);
}

#[tauri::command]
pub async fn is_session_connected(id: String) -> bool {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        let is_connected = session.ui_handler.is_connected();
        println!("🔍 [Auth Check] Session {} status: connected={}", id, is_connected);
        return is_connected;
    }
    false
}

use hbb_common::message_proto::{KeyEvent, Message};
use librustdesk::client::{self};
use librustdesk::common::input::{
    MOUSE_TYPE_DOWN, MOUSE_TYPE_UP, MOUSE_TYPE_WHEEL,
    MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_WHEEL,
};

#[tauri::command]
pub async fn send_mouse_event(id: String, x: i32, y: i32, button: i32, pressed: bool) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        let mask = if pressed {
            MOUSE_TYPE_DOWN
        } else {
            MOUSE_TYPE_UP
        };
        let button_mask = match button {
            0 => MOUSE_BUTTON_LEFT << 3,
            1 => MOUSE_BUTTON_RIGHT << 3,
            2 => MOUSE_BUTTON_WHEEL << 3,
            _ => 0,
        };
        client::send_mouse(
            mask | button_mask,
            x, y,
            false, false, false, false,
            session,
        );
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn send_mouse_move(id: String, x: i32, y: i32) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        client::send_mouse(
            0, // mask 0 = move
            x, y,
            false, false, false, false,
            session,
        );
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn send_wheel(id: String, _x: i32, _y: i32, delta_x: i32, delta_y: i32) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        // Use MOUSE_TYPE_WHEEL mask, delta goes into x/y fields
        client::send_mouse(
            MOUSE_TYPE_WHEEL,
            delta_x,
            delta_y,
            false, false, false, false,
            session,
        );
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn send_key_event(
    id: String,
    key: String,
    pressed: bool,
    ctrl: Option<bool>,
    shift: Option<bool>,
    alt: Option<bool>,
    meta: Option<bool>,
) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        use hbb_common::protos::message::KeyboardMode;
        use hbb_common::message_proto::ControlKey;
        let mut msg_out = Message::new();
        let mut key_event = KeyEvent::new();
        key_event.set_seq(key);
        key_event.press = pressed;
        key_event.mode = KeyboardMode::Auto.into();

        // Build modifier mask
        let mut modifiers = vec![];
        if ctrl.unwrap_or(false) {
            modifiers.push(hbb_common::protobuf::EnumOrUnknown::new(ControlKey::Control));
        }
        if shift.unwrap_or(false) {
            modifiers.push(hbb_common::protobuf::EnumOrUnknown::new(ControlKey::Shift));
        }
        if alt.unwrap_or(false) {
            modifiers.push(hbb_common::protobuf::EnumOrUnknown::new(ControlKey::Alt));
        }
        if meta.unwrap_or(false) {
            modifiers.push(hbb_common::protobuf::EnumOrUnknown::new(ControlKey::Meta));
        }
        key_event.modifiers = modifiers;

        msg_out.set_key_event(key_event);
        if let Some(sender) = session.sender.read().unwrap().as_ref() {
            if let Err(e) = sender.send(Data::Message(msg_out)) {
                return Err(format!("Failed to send key event: {}", e));
            }
            Ok(())
        } else {
            Err("Session sender not initialized".to_string())
        }
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, av1: bool) -> Result<(), String> {
    // Update the supported decodings in all active sessions
    // This tells the connection what codecs we support via browser WebCodecs
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    for (id, session) in sessions.iter() {
        let mut lc_guard = session.lc.write().unwrap();
        let mut se = lc_guard.supported_encoding.clone();
        se.vp8 = vp8;
        se.h264 = h264;
        se.av1 = av1;
        // VP9 is currently handled via CodecAbility (i444) in the proto definition
        if let Some(i444) = se.i444.as_mut() {
            i444.vp9 = vp9;
        } else {
            let mut i444 = hbb_common::message_proto::CodecAbility::new();
            i444.vp9 = vp9;
            se.i444 = hbb_common::protobuf::MessageField::some(i444);
        }
        lc_guard.supported_encoding = se;
        drop(lc_guard);

        // [New] Persist to global status so future sessions inherit these settings
        let codec_json = serde_json::json!({
            "vp8": vp8,
            "vp9": vp9,
            "h264": h264,
            "av1": av1,
        }).to_string();
        hbb_common::config::Status::set("browser-supported-codecs", codec_json);

        println!("📡 [Tauri] Triggering codec re-negotiation for session {}", id);

        // Notify the peer about our updated capabilities (SupportedDecoding)
        // We set different ability scores and a preference to ensure the encoder picks the best codec.
        let mut sd = hbb_common::message_proto::SupportedDecoding::new();
        // Force server to use better codecs by claiming we don't support VP8 
        // if better alternatives are confirmed by the browser.
        sd.ability_vp8 = if vp9 || av1 || h264 { 0 } else { 50 };
        if vp9 { sd.ability_vp9 = 90; }
        if h264 { sd.ability_h264 = 80; }
        if av1 { sd.ability_av1 = 100; }
        
        // Use explicit preference if possible
        if av1 {
            sd.prefer = hbb_common::protobuf::EnumOrUnknown::new(hbb_common::message_proto::supported_decoding::PreferCodec::AV1);
        } else if vp9 {
            sd.prefer = hbb_common::protobuf::EnumOrUnknown::new(hbb_common::message_proto::supported_decoding::PreferCodec::VP9);
        } else if h264 {
            sd.prefer = hbb_common::protobuf::EnumOrUnknown::new(hbb_common::message_proto::supported_decoding::PreferCodec::H264);
        }
        
        println!("📡 [Tauri] Negotiation: ability_vp9={}, ability_h264={}, prefer={:?}", 
            sd.ability_vp9, sd.ability_h264, sd.prefer);
        
        let mut option_msg = hbb_common::message_proto::OptionMessage::new();
        option_msg.supported_decoding = hbb_common::protobuf::MessageField::some(sd);
        
        let mut misc_msg = hbb_common::message_proto::Misc::new();
        misc_msg.set_option(option_msg);

        let mut msg_out = hbb_common::message_proto::Message::new();
        msg_out.set_misc(misc_msg);
        
        // 1. Send the updated capabilities
        session.send(librustdesk::client::Data::Message(msg_out));

        // 2. Aggressively request video refreshes to force a KeyFrame (I-Frame)
        // Send multiple variations to ensure compatibility across different RustDesk server versions
        let mut refresh_all = hbb_common::message_proto::Misc::new();
        refresh_all.set_refresh_video(true);
        let mut msg_refresh_all = hbb_common::message_proto::Message::new();
        msg_refresh_all.set_misc(refresh_all);
        session.send(librustdesk::client::Data::Message(msg_refresh_all));

        let mut refresh_display = hbb_common::message_proto::Misc::new();
        refresh_display.set_refresh_video_display(0); // Primary display
        let mut msg_refresh_display = hbb_common::message_proto::Message::new();
        msg_refresh_display.set_misc(refresh_display);
        session.send(librustdesk::client::Data::Message(msg_refresh_display));

        // 3. Small delay then refresh again just in case the encoder was still switching
        let id_clone = id.to_string();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let senders = SESSION_SENDERS.lock().unwrap();
            if let Some(tx) = senders.get(&id_clone) {
                let mut again = hbb_common::message_proto::Misc::new();
                again.set_refresh_video(true);
                let mut m = hbb_common::message_proto::Message::new();
                m.set_misc(again);
                let _ = tx.send(Data::Message(m));
            }
        });

        println!("📡 [Tauri] Negotiated codec and triggered aggressive refresh for {}", id);
    }
    drop(sessions);
    println!("✅ [Tauri] Updated browser supported codecs and notified peers: vp8={}, vp9={}, h264={}, av1={}", vp8, vp9, h264, av1);
    Ok(())
}
#[tauri::command]
pub async fn send_ctrl_alt_del(id: String) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.ctrl_alt_del();
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn set_remote_option(id: String, key: String, value: String) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.set_option(key, value);
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn switch_display(app: tauri::AppHandle, id: String, display: i32) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.switch_display(display);
        println!("🖥️ [Tauri] Sent switch_display({}) to peer: {}", display, id);
        // Optimistically update the UI to prevent jumping back
        let _ = app.emit("current-display-changed", display);
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}
