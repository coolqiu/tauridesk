// file_transfer.rs
use crate::commands::session::ACTIVE_SESSIONS;
use hbb_common::{fs, message_proto::*};
use librustdesk::client::Data;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
}

#[derive(Serialize, Deserialize)]
pub struct DirResult {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

#[tauri::command]
pub async fn fs_read_local_dir(path: String) -> Result<DirResult, String> {
    let include_hidden = true;
    match fs::read_dir(&fs::get_path(&path), include_hidden) {
        Err(e) => Err(e.to_string()),
        Ok(fd) => {
            let entries = fd.entries.iter().map(|e| {
                // In RustDesk protobuf: Dir=0, DirLink=2, DirDrive=3, File=4, FileLink=5
                let is_dir = e.entry_type.value() < 4;
                FileEntry {
                    name: e.name.clone(),
                    is_dir,
                    size: e.size,
                    modified: e.modified_time,
                }
            }).collect();
            Ok(DirResult { path, entries })
        }
    }
}

#[tauri::command]
pub async fn fs_read_remote_dir(id: String, path: String) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    
    println!("🔍 [FS] Looking for session: '{}'", id);
    println!("🔍 [FS] Currently active sessions: {:?}", sessions.keys().collect::<Vec<_>>());

    if let Some(session) = sessions.get(&id) {
        let mut msg_out = Message::new();
        let mut file_action = FileAction::new();
        let mut read_dir = ReadDir::new();
        read_dir.path = path.clone();
        read_dir.include_hidden = true;
        file_action.set_read_dir(read_dir);
        msg_out.set_file_action(file_action);
        
        if let Some(sender) = session.sender.read().unwrap().as_ref() {
            println!("📡 [FS] Sending ReadDir request to peer {}", id);
            sender.send(Data::Message(msg_out)).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            println!("⚠️ [FS] Session sender for {} is not ready yet!", id);
            Err("Session sender not initialized".into())
        }
    } else {
        println!("❌ [FS] Session '{}' not found in ACTIVE_SESSIONS map", id);
        Err("Session not found".into())
    }
}

#[tauri::command]
pub async fn open_file_transfer_window(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let window_label = format!("file_transfer_{}", id.replace("-", "_").replace(".", "_"));
    if let Some(window) = app.get_webview_window(&window_label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App(format!("/#/file-transfer/{}", id).into())
    )
    .title(format!("File Transfer - {}", id))
    .inner_size(900.0, 600.0)
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn fs_get_home_dir() -> String {
    fs::get_home_as_string()
}

#[tauri::command]
pub async fn fs_transfer_files(
    id: String,
    files: Vec<String>,
    to: String,
    is_remote: bool,
    act_id: i32,
) -> Result<(), String> {
    let id = id.trim().to_string();
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        if let Some(sender) = session.sender.read().unwrap().as_ref() {
            let mut cnt = 0;
            for f in files {
                if fs::get_path(&f).exists() || is_remote {
                    sender.send(Data::SendFiles((
                        act_id,
                        fs::JobType::Generic.into(),
                        f.clone(),
                        to.clone(),
                        0,
                        true,
                        is_remote,
                    ))).map_err(|e| e.to_string())?;
                    cnt += 1;
                }
            }
            if cnt > 0 {
                Ok(())
            } else {
                Err("No valid files to transfer".to_string())
            }
        } else {
            Err("Session sender not found".to_string())
        }
    } else {
        Err("Session not found".to_string())
    }
}

fn send_session_data(id: &str, data: Data) -> Result<(), String> {
    let sessions = ACTIVE_SESSIONS.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get(id)
        .ok_or_else(|| "Session not found".to_string())?;
    let sender = session
        .sender
        .read()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "Session sender not found".to_string())?;
    sender.send(data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_cancel_job(id: String, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::CancelJob(act_id))
}

#[tauri::command]
pub async fn fs_resume_job(id: String, act_id: i32, is_remote: bool) -> Result<(), String> {
    send_session_data(id.trim(), Data::ResumeJob((act_id, is_remote)))
}

#[tauri::command]
pub async fn fs_create_dir(id: String, path: String, is_remote: bool, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::CreateDir((act_id, path, is_remote)))
}

#[tauri::command]
pub async fn fs_remove_file(id: String, path: String, file_num: i32, is_remote: bool, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::RemoveFile((act_id, path, file_num, is_remote)))
}

#[tauri::command]
pub async fn fs_remove_dir_all(id: String, path: String, is_remote: bool, include_hidden: bool, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::RemoveDirAll((act_id, path, is_remote, include_hidden)))
}

#[tauri::command]
pub async fn fs_read_dir_to_remove_recursive(id: String, path: String, is_remote: bool, include_hidden: bool, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::RemoveDirAll((act_id, path, is_remote, include_hidden)))
}

#[tauri::command]
pub async fn fs_remove_all_empty_dirs(id: String, path: String, is_remote: bool, act_id: i32) -> Result<(), String> {
    if is_remote {
        send_session_data(id.trim(), Data::RemoveDir((act_id, path)))
    } else {
        fs::remove_all_empty_dir(&fs::get_path(&path)).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn fs_set_no_confirm(id: String, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::SetNoConfirm(act_id))
}

#[tauri::command]
pub async fn fs_confirm_delete_files(id: String, act_id: i32, file_num: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::ConfirmDeleteFiles((act_id, file_num)))
}

#[tauri::command]
pub async fn fs_rename_file(id: String, path: String, new_name: String, is_remote: bool, act_id: i32) -> Result<(), String> {
    send_session_data(id.trim(), Data::RenameFile((act_id, path, new_name, is_remote)))
}

#[tauri::command]
pub async fn fs_confirm_override_file(
    id: String,
    act_id: i32,
    file_num: i32,
    need_override: bool,
    remember: bool,
    is_upload: bool,
) -> Result<(), String> {
    send_session_data(
        id.trim(),
        Data::SetConfirmOverrideFile((act_id, file_num, need_override, remember, is_upload)),
    )
}
