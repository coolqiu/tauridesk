// commands/peers.rs — v1.0
// Peer（远端设备）列表管理命令



/// 获取完整 Peer 列表（最近连接）
#[tauri::command]
pub fn get_recent_peers() -> String {
    // 获取全部的 peer ID 列表（包含路径、修改时间等元数据）
    let vec_id_modified_time_path = hbb_common::config::PeerConfig::get_vec_id_modified_time_path(&None);
    
    // 一次性加载所有的 Peers
    let mut peers_next = hbb_common::config::PeerConfig::batch_peers(&vec_id_modified_time_path, 0, None); 
    
    let peers: Vec<_> = peers_next.0.drain(..).map(|(id, _, p)| {
        use std::collections::HashMap;
        let map = HashMap::<&'static str, String>::from([
            ("id", id),
            ("username", p.info.username.clone()),
            ("hostname", p.info.hostname.clone()),
            ("platform", p.info.platform.clone()),
            ("alias", p.options.get("alias").unwrap_or(&"".to_owned()).to_owned()),
        ]);
        // Avoid using sodiumoxide directly, just output basic info for now.
        map
    }).collect();
    
    serde_json::to_string(&peers).unwrap_or("[]".to_owned())
}

/// 从 librustdesk Config 读取收藏 Peer 列表
#[tauri::command]
pub fn get_favorite_peers() -> Vec<String> {
    librustdesk::ui_interface::get_fav()
}

/// 添加 Peer ID 到收藏
#[tauri::command]
pub fn add_favorite_peer(id: String) -> Result<(), String> {
    let mut favs = get_favorite_peers();
    if !favs.contains(&id) {
        favs.push(id);
        librustdesk::ui_interface::store_fav(favs);
    }
    Ok(())
}

/// 从收藏中移除 Peer ID
#[tauri::command]
pub fn remove_favorite_peer(id: String) -> Result<(), String> {
    let favs: Vec<String> = get_favorite_peers()
        .into_iter()
        .filter(|p| p != &id)
        .collect();
    librustdesk::ui_interface::store_fav(favs);
    Ok(())
}

/// 删除最近连接记录中的某个 Peer
#[tauri::command]
pub fn remove_peer(id: String) -> Result<(), String> {
    hbb_common::config::PeerConfig::remove(&id);
    Ok(())
}
