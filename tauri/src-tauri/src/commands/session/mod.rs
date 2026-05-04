// session/mod.rs
pub mod connect;
pub mod display;
pub mod input;
pub mod codecs;

pub use connect::*;
pub use display::*;
pub use input::*;
pub use codecs::*;

use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use lazy_static::lazy_static;
use librustdesk::ui_session_interface::Session;
use crate::session_handler::TauriHandler;
use hbb_common::tokio::sync::mpsc::UnboundedSender;
use librustdesk::client::Data;

lazy_static! {
    pub static ref ACTIVE_SESSIONS: Arc<Mutex<HashMap<String, Session<TauriHandler>>>> = Arc::new(Mutex::new(HashMap::new()));
    pub static ref SESSION_SENDERS: Arc<Mutex<HashMap<String, UnboundedSender<Data>>>> = Arc::new(Mutex::new(HashMap::new()));
    pub static ref FILE_TRANSFER_SESSIONS: Arc<Mutex<HashMap<String, Session<TauriHandler>>>> = Arc::new(Mutex::new(HashMap::new()));
    pub static ref FILE_TRANSFER_SENDERS: Arc<Mutex<HashMap<String, UnboundedSender<Data>>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn set_remote_option(id: String, key: String, value: String) -> Result<(), String> {
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.set_option(key, value);
        Ok(())
    } else {
        Err("Session not found".into())
    }
}
