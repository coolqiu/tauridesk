
#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, av1: bool) -> Result<(), String> {
    // Update the supported decodings in the global login context
    use librustdesk::client::io_loop::LOGIN_CONTEXT;
    let mut lc = LOGIN_CONTEXT.lock().unwrap();
    if let Some(lc_inner) = lc.as_mut() {
        let mut se = lc_inner.supported_encoding.clone();
        se.vp8 = vp8;
        se.vp9 = se.vp9 || vp9;
        se.h264 = se.h264 || h264;
        se.av1 = se.av1 || av1;
        lc_inner.supported_encoding = se;
        drop(lc);
        println!("✅ [Tauri] Updated browser supported codecs: vp8={}, vp9={}, h264={}, av1={}", vp8, vp9, h264, av1);
        Ok(())
    } else {
        Err("No login context found".to_string())
    }
}


#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, av1: bool) -> Result<(), String> {
    // Update the supported decodings in the global login context
    use librustdesk::client::io_loop::LOGIN_CONTEXT;
    let mut lc = LOGIN_CONTEXT.lock().unwrap();
    if let Some(lc_inner) = lc.as_mut() {
        let mut se = lc_inner.supported_encoding.clone();
        se.vp8 = vp8;
        se.vp9 = se.vp9 || vp9;
        se.h264 = se.h264 || h264;
        se.av1 = se.av1 || av1;
        lc_inner.supported_encoding = se;
        drop(lc);
        println!("✅ [Tauri] Updated browser supported codecs: vp8={}, vp9={}, h264={}, av1={}", vp8, vp9, h264, av1);
        Ok(())
    } else {
        Err("No login context found".to_string())
    }
}

#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, av1: bool) -> Result<(), String> {
    // Update the supported decodings in the global login context
    use librustdesk::client::io_loop::LOGIN_CONTEXT;
    let mut lc = LOGIN_CONTEXT.lock().unwrap();
    if let Some(lc_inner) = lc.as_mut() {
        let mut se = lc_inner.supported_encoding.clone();
        se.vp8 = vp8;
        se.vp9 = se.vp9 || vp9;
        se.h264 = se.h264 || h264;
        se.av1 = se.av1 || av1;
        lc_inner.supported_encoding = se;
        drop(lc);
        println!("✅ [Tauri] Updated browser supported codecs: vp8={}, vp9={}, h264={}, av1={}", vp8, vp9, h264, av1);
        Ok(())
    } else {
        Err("No login context found".to_string())
    }
}

