use crate::commands::session::SESSION_SENDERS;
use librustdesk::client::Data;
use hbb_common::message_proto::*;
use tauri::ipc::Channel;

#[tauri::command]
pub async fn refresh_video(id: String) -> Result<(), String> {
    let mut misc = Misc::new();
    misc.set_refresh_video(true);
    
    let mut msg = Message::new();
    msg.set_misc(misc);
    send_to_session(&id, Data::Message(msg))
}

#[tauri::command]
pub async fn switch_display(id: String, display: i32) -> Result<(), String> {
    let mut switch = SwitchDisplay::new();
    switch.display = display;
    
    let mut misc = Misc::new();
    misc.set_switch_display(switch);
    
    let mut msg = Message::new();
    msg.set_misc(misc);
    send_to_session(&id, Data::Message(msg))
}

#[tauri::command]
pub async fn listen_video_stream(id: String, channel: Channel) -> Result<(), String> {
    let id = id.trim().to_string();
    static NONCE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
    let nonce = NONCE.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    
    println!("📺 [Tauri Command] Binding video stream for {} (nonce: {})", id, nonce);
    if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
        channels.insert(id, (channel, nonce));
    }
    Ok(())
}

#[tauri::command]
pub async fn unlisten_video_stream(id: String) -> Result<(), String> {
    let id = id.trim().to_string();
    if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
        channels.remove(&id);
    }
    Ok(())
}

#[tauri::command]
pub async fn force_clear_video_channels() -> Result<(), String> {
    if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
        channels.clear();
    }
    Ok(())
}

fn send_to_session(id: &str, data: Data) -> Result<(), String> {
    let senders = SESSION_SENDERS.lock().unwrap();
    if let Some(sender) = senders.get(id) {
        sender.send(data).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session sender not found".to_string())
    }
}
