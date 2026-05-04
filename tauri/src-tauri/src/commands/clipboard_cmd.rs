// commands/clipboard_cmd.rs
// 剪贴板双向同步命令

use crate::commands::session::ACTIVE_SESSIONS;
use hbb_common::message_proto::{Clipboard, Message};

/// 将本地剪贴板文本发送给远端
#[tauri::command]
pub async fn send_clipboard_text(id: String, text: String) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        let mut clipboard = Clipboard::new();
        clipboard.compress = false;
        clipboard.content = text.clone().into_bytes().into();

        let mut msg_out = Message::new();
        msg_out.set_clipboard(clipboard);

        if let Some(sender) = session.sender.read().unwrap().as_ref() {
            // Explicitly use librustdesk::client::Data to help inference
            if let Err(e) = sender.send(librustdesk::client::Data::Message(msg_out)) {
                return Err(format!("Failed to send clipboard: {}", e));
            }
            println!("📋 [Clipboard] Sent {} bytes to peer: {}", text.len(), id);
            Ok(())
        } else {
            Err("Session sender not initialized".to_string())
        }
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}
