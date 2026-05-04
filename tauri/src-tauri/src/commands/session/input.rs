use crate::commands::session::{ACTIVE_SESSIONS, SESSION_SENDERS};
use hbb_common::message_proto::{ControlKey, KeyEvent, Message};
use hbb_common::protos::message::KeyboardMode;
use librustdesk::client::{self, Data};
use librustdesk::common::input::{
    MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_WHEEL, MOUSE_TYPE_DOWN, MOUSE_TYPE_UP,
    MOUSE_TYPE_WHEEL,
};

#[tauri::command]
pub async fn send_mouse_event(id: String, x: i32, y: i32, button: i32, pressed: bool) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        let mask = if pressed { MOUSE_TYPE_DOWN } else { MOUSE_TYPE_UP };
        let button_mask = match button {
            0 => MOUSE_BUTTON_LEFT << 3,
            1 => MOUSE_BUTTON_RIGHT << 3,
            2 => MOUSE_BUTTON_WHEEL << 3,
            _ => 0,
        };
        client::send_mouse(mask | button_mask, x, y, false, false, false, false, session);
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn send_mouse_move(id: String, x: i32, y: i32) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        client::send_mouse(0, x, y, false, false, false, false, session);
        Ok(())
    } else {
        Err(format!("No active session found for '{}'", id))
    }
}

#[tauri::command]
pub async fn send_wheel(id: String, _x: i32, _y: i32, delta_x: i32, delta_y: i32) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get(&id) {
        client::send_mouse(
            MOUSE_TYPE_WHEEL,
            delta_x,
            delta_y,
            false,
            false,
            false,
            false,
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
    let mut key_event = KeyEvent::new();
    key_event.set_seq(key);
    key_event.press = pressed;
    key_event.mode = KeyboardMode::Auto.into();

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

    let mut msg = Message::new();
    msg.set_key_event(key_event);
    send_to_session(&id, Data::Message(msg))
}

#[tauri::command]
pub async fn send_ctrl_alt_del(id: String) -> Result<(), String> {
    let sessions = crate::commands::session::ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session.ctrl_alt_del();
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
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
