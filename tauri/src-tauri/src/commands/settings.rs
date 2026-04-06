// commands/settings.rs — v1.0
// 通用配置项读写命令（key-value 模式）

use serde::{Deserialize, Serialize};

/// 批量配置项（用于一次性读取多个键）
#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsBatch {
    pub theme: String,
    pub language: String,
    pub image_quality: String,
    pub view_style: String,
    pub scroll_style: String,
    pub open_new_conn_in_tabs: bool,
    pub enable_check_update: bool,
}

/// 读取单个配置项
#[tauri::command]
pub fn get_option(key: String) -> String {
    librustdesk::ui_interface::get_option(key)
}

/// 写入单个配置项
#[tauri::command]
pub fn set_option(key: String, value: String) -> Result<(), String> {
    if key.is_empty() {
        return Err("Option key cannot be empty".to_string());
    }
    librustdesk::ui_interface::set_option(key, value);
    Ok(())
}

/// 读取本地（用户级）配置项
#[tauri::command]
pub fn get_local_option(key: String) -> String {
    librustdesk::ui_interface::get_local_option(key)
}

/// 写入本地配置项
#[tauri::command]
pub fn set_local_option(key: String, value: String) -> Result<(), String> {
    if key.is_empty() {
        return Err("Option key cannot be empty".to_string());
    }
    librustdesk::ui_interface::set_local_option(key, value);
    Ok(())
}

/// 批量读取常用设置（减少前端 invoke 次数）
#[tauri::command]
pub fn get_settings_batch() -> SettingsBatch {
    let open_new = librustdesk::ui_interface::get_option(
        "enable-open-new-connections-in-tabs",
    );
    let check_update =
        librustdesk::ui_interface::get_option("enable-check-update");

    SettingsBatch {
        theme: librustdesk::ui_interface::get_local_option("theme".to_string()),
        language: librustdesk::ui_interface::get_local_option("lang".to_string()),
        image_quality: librustdesk::ui_interface::get_option("image_quality"),
        view_style: librustdesk::ui_interface::get_option("view_style"),
        scroll_style: librustdesk::ui_interface::get_option("scroll_style"),
        open_new_conn_in_tabs: open_new != "N",
        enable_check_update: check_update != "N",
    }
}

/// 获取应用是否已安装（Windows 服务注册）
#[tauri::command]
pub fn is_installed() -> bool {
    librustdesk::ui_interface::is_installed()
}

// ─── 单元测试 ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_option_empty_key_returns_error() {
        let result = set_option("".to_string(), "value".to_string());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Option key cannot be empty");
    }
}
