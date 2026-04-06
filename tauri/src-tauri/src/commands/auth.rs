// auth.rs — [Phase 25] Tauri Native Authorizer Commands
use librustdesk::ui_interface::PENDING_CONNS;
use librustdesk::ipc;

#[derive(serde::Deserialize)]
pub struct AuthPermissions {
    pub keyboard: bool,
    pub clipboard: bool,
    pub audio: bool,
    pub file: bool,
    pub restart: bool,
    pub recording: bool,
    pub block_input: bool,
}

#[tauri::command]
pub async fn authorize_connection(
    id: i32,
    perms: AuthPermissions,
) -> Result<(), String> {
    println!("🛡️ [Tauri Auth] Authorizing connection: {}", id);
    let mut conns = PENDING_CONNS.lock().unwrap();
    if let Some(tx) = conns.remove(&id) {
        if let Err(e) = tx.send(ipc::Data::Authorize {
            keyboard: perms.keyboard,
            clipboard: perms.clipboard,
            audio: perms.audio,
            file: perms.file,
            restart: perms.restart,
            recording: perms.recording,
            block_input: perms.block_input,
        }) {
            return Err(format!("Failed to send authorize signal: {}", e));
        }
        Ok(())
    } else {
        println!("❌ [Tauri Auth] Connection ID {} not found in pending list. Available: {:?}", id, conns.keys().collect::<Vec<_>>());
        Err(format!("Connection ID {} not found in pending list", id))
    }
}

#[tauri::command]
pub async fn reject_connection(id: i32) -> Result<(), String> {
    println!("🚫 [Tauri Auth] Rejecting connection: {}", id);
    let mut conns = PENDING_CONNS.lock().unwrap();
    if let Some(tx) = conns.remove(&id) {
        if let Err(e) = tx.send(ipc::Data::Close) {
            return Err(format!("Failed to send close signal: {}", e));
        }
        Ok(())
    } else {
        Err(format!("Connection ID {} not found in pending list", id))
    }
}
