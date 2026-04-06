// commands/system.rs — v1.0
// 系统信息、应用版本等只读命令

use serde::{Deserialize, Serialize};

/// 应用基本信息
#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub is_portable: bool,
}

/// 获取应用基本信息
#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "RustDesk".to_string(),
        version: librustdesk::ui_interface::get_version(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        is_portable: std::env::var("RUSTDESK_APPNAME").is_ok(),
    }
}

/// 获取应用版本号
#[tauri::command]
pub fn get_version() -> String {
    librustdesk::ui_interface::get_version()
}



// ─── 单元测试 ────────────────────────────────────────────────────


