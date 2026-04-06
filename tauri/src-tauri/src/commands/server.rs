// commands/server.rs — v1.0
// 服务端状态相关命令：本机 ID、密码、连接状态

use serde::{Deserialize, Serialize};

/// 服务端完整状态快照（对应 Flutter ServerModel）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerState {
    pub id: String,
    pub temporary_password: String,
    pub permanent_password_set: bool,
    pub verification_method: String,
    pub approve_mode: String,
    pub connect_status: i32, // -1=失败, 0=连接中, 1=已连接
    pub is_service_running: bool,
}

/// 获取本机 RustDesk ID
#[tauri::command]
pub fn get_id() -> String {
    librustdesk::ipc::get_id()
}

/// 获取完整的服务端状态（一次性返回所有关键字段）
#[tauri::command]
pub fn get_server_state() -> ServerState {
    let id = librustdesk::ipc::get_id();
    let temporary_password = librustdesk::ui_interface::temporary_password();
    let permanent_password_set = librustdesk::ui_interface::is_permanent_password_set();
    let verification_method = librustdesk::ui_interface::get_option("verification-method");
    let approve_mode = librustdesk::ui_interface::get_option("approve-mode");

    // RustDesk 后端通过 UiStatus 获取包含 status_num 的连接状态
    let ui_status = librustdesk::ui_interface::get_connect_status();

    ServerState {
        id,
        temporary_password: if temporary_password.is_empty() {
            "Generating...".to_string()
        } else {
            temporary_password
        },
        permanent_password_set,
        verification_method: if verification_method.is_empty() {
            "use-both-passwords".to_string()
        } else {
            verification_method
        },
        approve_mode: if approve_mode.is_empty() {
            "password".to_string()
        } else {
            approve_mode
        },
        connect_status: ui_status.status_num,
        is_service_running: true, // Tauri 模式下服务随应用启动
    }
}

/// 获取临时密码
#[tauri::command]
pub fn get_temporary_password() -> String {
    let pwd = librustdesk::ui_interface::temporary_password();
    if pwd.is_empty() {
        "Generating...".to_string()
    } else {
        pwd
    }
}

/// 刷新临时密码
#[tauri::command]
pub fn refresh_temporary_password() -> Result<(), String> {
    librustdesk::ui_interface::update_temporary_password();
    Ok(())
}

/// 检查永久密码是否设置
#[tauri::command]
pub fn is_permanent_password_set() -> bool {
    librustdesk::ui_interface::is_permanent_password_set()
}

/// 设置永久密码
#[tauri::command]
pub fn set_permanent_password(password: String) -> Result<(), String> {
    if !librustdesk::ui_interface::set_permanent_password_with_result(password) {
        return Err("Failed to set permanent password".to_string());
    }
    Ok(())
}
