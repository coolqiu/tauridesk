use hbb_common::{
    log,
    message_proto::{CursorData, CursorPosition, EncodedVideoFrame},
    rendezvous_proto::ConnType,
};
use scrap::CodecFormat;
use librustdesk::ui_session_interface::InvokeUiSession;
use librustdesk::client::QualityStatus;
use hbb_common::message_proto::{SwitchDisplay, TerminalResponse, ReadEmptyDirsResponse, WindowsSession, PeerInfo, DisplayInfo, FileEntry};
use tauri::{AppHandle, Emitter};

// Represents a Tauri session, handles bridging `Session` trait events to Tauri Frontend
#[derive(Clone, Default)]
pub struct TauriHandler {
    app_handle: Option<AppHandle>,
    remote_id: String,
    is_connected: std::sync::Arc<std::sync::atomic::AtomicBool>,
    // Store remote display dimensions for WebCodecs decoder initialization
    display_width: std::sync::Arc<std::sync::Mutex<Option<u32>>>,
    display_height: std::sync::Arc<std::sync::Mutex<Option<u32>>>,
}

impl Drop for TauriHandler {
    fn drop(&mut self) {
        log::info!("🗑️  TauriHandler for {} dropped", self.remote_id);
    }
}

impl TauriHandler {
    pub fn new(app_handle: Option<AppHandle>, remote_id: String) -> Self {
        Self {
            app_handle,
            remote_id,
            is_connected: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
            display_width: std::sync::Arc::new(std::sync::Mutex::new(None)),
            display_height: std::sync::Arc::new(std::sync::Mutex::new(None)),
        }
    }

    pub fn is_connected(&self) -> bool {
        self.is_connected.load(std::sync::atomic::Ordering::SeqCst)
    }

    fn emit<S: serde::Serialize + Clone>(&self, event: &str, payload: S) {
        if let Some(app) = &self.app_handle {
            let _ = app.emit(event, payload);
        }
    }
}

// -------------------------------------------------------------
// InvokeUiSession implementation for TauriHandler
// These are all required by `Session<TauriHandler>`
// -------------------------------------------------------------
impl InvokeUiSession for TauriHandler {
    fn set_cursor_data(&self, cd: CursorData) {
        // 将光标 RGBA 数据编码后发给前端，前端用来创建自定义 CSS cursor
        use hbb_common::sodiumoxide::base64;
        let rgba_b64 = base64::encode(&cd.colors, base64::Variant::Original);
        #[derive(Clone, serde::Serialize)]
        struct CursorDataPayload {
            id: u64,
            hotx: i32,
            hoty: i32,
            width: i32,
            height: i32,
            colors: String, // base64 encoded RGBA
        }
        self.emit("cursor-data", CursorDataPayload {
            id: cd.id,
            hotx: cd.hotx,
            hoty: cd.hoty,
            width: cd.width,
            height: cd.height,
            colors: rgba_b64,
        });
    }

    fn set_cursor_id(&self, id: String) {
        self.emit("cursor-id", id);
    }

    fn set_cursor_position(&self, cp: CursorPosition) {
        #[derive(Clone, serde::Serialize)]
        struct CursorPos { x: i32, y: i32 }
        self.emit("cursor-position", CursorPos { x: cp.x, y: cp.y });
    }

    fn set_display(&self, _x: i32, _y: i32, w: i32, h: i32, _cursor_embedded: bool, _scale: f64) {
        // Save display dimensions for WebCodecs decoder
        let mut width = self.display_width.lock().unwrap();
        let mut height = self.display_height.lock().unwrap();
        *width = Some(w as u32);
        *height = Some(h as u32);
        println!("📺 [Session {}] set_display: {}x{}", self.remote_id, w, h);

        // Send display dimensions to frontend for WebCodecs decoder init
        #[derive(Clone, serde::Serialize)]
        struct DisplaySize {
            width: u32,
            height: u32,
        }
        self.emit("video-display-size", DisplaySize {
            width: w as u32,
            height: h as u32,
        });
    }

    fn switch_display(&self, display: &SwitchDisplay) {
        println!("🖥️ [Tauri Handler] PEER switched display to: {}", display.display);
        self.emit("current-display-changed", display.display);
    }

    fn set_peer_info(&self, _peer_info: &PeerInfo) {}

    fn set_displays(&self, displays: &Vec<DisplayInfo>) {
        #[derive(serde::Serialize, Clone)]
        struct DisplayPayload {
            x: i32,
            y: i32,
            width: i32,
            height: i32,
            cursor_embedded: bool,
        }
        let payload: Vec<DisplayPayload> = displays.iter().map(|d| DisplayPayload {
            x: d.x,
            y: d.y,
            width: d.width,
            height: d.height,
            cursor_embedded: d.cursor_embedded,
        }).collect();

        println!("🖥️ [Tauri Handler] DISPLAYS UPDATED: count={}", payload.len());
        self.emit("displays-updated", payload);
    }

    fn set_platform_additions(&self, _data: &str) {}

    fn on_connected(&self, conn_type: ConnType) {
        println!("🔗 [Session {}] Connected via {:?}", self.remote_id, conn_type);
        self.is_connected.store(true, std::sync::atomic::Ordering::SeqCst);
    }

    fn update_privacy_mode(&self) {
        // Note: privacy-mode boolean already tracked by remoteOptions in frontend via set_remote_option
        // This event just notifies frontend to update the UI
        // Since we don't have access to the Session's privacy-mode state here, emit generic event
        #[derive(serde::Serialize, Clone)]
        struct OptionPayload { key: String }
        self.emit("remote-option-changed", OptionPayload { key: "privacy-mode".to_string() });
    }

    fn set_permission(&self, _name: &str, _value: bool) {}

    fn close_success(&self) {
        println!("✅ [Session {}] close_success", self.remote_id);
        self.is_connected.store(true, std::sync::atomic::Ordering::SeqCst);
    }

    fn update_quality_status(&self, qs: QualityStatus) {
        #[derive(serde::Serialize, Clone)]
        struct QualityStatusPayload {
            speed: String,
            delay: String,
        }
        self.emit("quality-status", QualityStatusPayload {
            speed: qs.speed.clone().unwrap_or_default(),
            delay: qs.delay.map(|d| d.to_string()).unwrap_or_default(),
        });
    }

    fn set_connection_type(&self, _is_secured: bool, _direct: bool, _stream_type: &str) {}

    fn set_fingerprint(&self, _fingerprint: String) {}

    fn job_error(&self, id: i32, err: String, file_num: i32) {
        #[derive(serde::Serialize, Clone)]
        struct JobErrorPayload {
            peer_id: String,
            id: i32,
            err: String,
            file_num: i32,
        }
        self.emit("fs-job-error", JobErrorPayload {
            peer_id: self.remote_id.clone(),
            id,
            err,
            file_num,
        });
    }

    fn job_done(&self, id: i32, file_num: i32) {
        #[derive(serde::Serialize, Clone)]
        struct JobDonePayload {
            peer_id: String,
            id: i32,
            file_num: i32,
        }
        self.emit("fs-job-done", JobDonePayload {
            peer_id: self.remote_id.clone(),
            id,
            file_num,
        });
    }

    fn clear_all_jobs(&self) {}

    fn new_message(&self, _msg: String) {}

    fn update_transfer_list(&self) {
        self.emit("fs-transfer-list-updated", self.remote_id.clone());
    }

    fn load_last_job(&self, _cnt: i32, _job_json: &str, _auto_start: bool) {}

    fn update_folder_files(
        &self,
        _id: i32,
        entries: &Vec<FileEntry>,
        path: String,
        _is_local: bool,
        _only_count: bool,
    ) {
        #[derive(serde::Serialize, Clone)]
        struct TauriFileEntry {
            name: String,
            is_dir: bool,
            size: u64,
            modified: u64,
        }
        #[derive(serde::Serialize, Clone)]
        struct DirResultPayload {
            id: String,
            act_id: i32,
            path: String,
            entries: Vec<TauriFileEntry>,
        }

        let tauri_entries: Vec<TauriFileEntry> = entries.iter().map(|e| {
            // FileType: Dir=0, DirLink=2, DirDrive=3 are all "directories"
            let is_dir = e.entry_type.value() < 4;
            TauriFileEntry {
                name: e.name.clone(),
                is_dir,
                size: e.size,
                modified: e.modified_time,
            }
        }).collect();

        println!("📂 [Tauri Handler] Folder files updated: id={}, '{}' ({} entries) for peer {}", _id, path, tauri_entries.len(), self.remote_id);

        let payload = DirResultPayload {
            id: self.remote_id.clone(),
            act_id: _id,
            path: path.clone(),
            entries: tauri_entries,
        };
        if _id > 0 {
            self.emit("fs-folder-files", payload);
        } else {
            self.emit("fs-remote-dir", payload);
        }
    }

    fn confirm_delete_files(&self, _id: i32, _i: i32, _name: String) {}

    fn override_file_confirm(
        &self,
        id: i32,
        file_num: i32,
        to: String,
        is_upload: bool,
        is_identical: bool,
    ) {
        #[derive(serde::Serialize, Clone)]
        struct OverridePayload {
            peer_id: String,
            id: i32,
            file_num: i32,
            to: String,
            is_upload: bool,
            is_identical: bool,
        }
        self.emit("fs-override-file-confirm", OverridePayload {
            peer_id: self.remote_id.clone(),
            id,
            file_num,
            to,
            is_upload,
            is_identical,
        });
    }

    fn update_block_input_state(&self, on: bool) {
        #[derive(serde::Serialize, Clone)]
        struct OptionPayload { key: String, value: bool }
        self.emit("remote-option-changed", OptionPayload { key: "block-input".to_string(), value: on });
    }

    fn job_progress(&self, id: i32, file_num: i32, speed: f64, finished_size: f64) {
        #[derive(serde::Serialize, Clone)]
        struct JobProgressPayload {
            peer_id: String,
            id: i32,
            file_num: i32,
            speed: f64,
            finished_size: f64,
        }
        self.emit("fs-job-progress", JobProgressPayload {
            peer_id: self.remote_id.clone(),
            id,
            file_num,
            speed,
            finished_size,
        });
    }

    fn adapt_size(&self) {}

    fn on_rgba(&self, _display: usize, rgba: &mut scrap::ImageRgb) {
        // Sample logging to avoid terminal flood
        use std::sync::atomic::{AtomicU64, Ordering};
        static RGBA_COUNT: AtomicU64 = AtomicU64::new(0);
        
        let count = RGBA_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
        if count % 60 == 1 {
            println!("🖼️ [Tauri Handler] RGBA RECEIVED: #{} ({}x{}), size={}", count, rgba.w, rgba.h, rgba.raw.len());
        }

        // Try to send via high-performance binary Channel if registered
        let clean_id = self.remote_id.trim().to_string();
        let mut failed_to_send = false;
        let mut channel_found = false;
        let mut _nonce_version = 0u64;

        if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
            if let Some((channel, nonce)) = channels.get(&clean_id) {
                _nonce_version = *nonce;
                // Binary Format: [type: 1 byte][W(4), H(4), PIXELS...]
                // type = 255 means RGBA (legacy software fallback)
                let mut binary_payload = Vec::with_capacity(9 + rgba.raw.len());
                binary_payload.push(255); // type marker for RGBA software mode
                binary_payload.extend_from_slice(&(rgba.w as u32).to_le_bytes());
                binary_payload.extend_from_slice(&(rgba.h as u32).to_le_bytes());
                binary_payload.extend_from_slice(&rgba.raw);

                if let Err(_) = channel.send(tauri::ipc::InvokeResponseBody::Raw(binary_payload)) {
                    failed_to_send = true;
                }
                channel_found = true;
            }
            
            // Auto-Pruning with Nonce logging
            if failed_to_send {
                println!("🧹 [Stream] Pruning STALE channel (Nonce v{}) for peer: '{}'", _nonce_version, clean_id);
                channels.remove(&clean_id);
            }
        }

        if !channel_found {
            // Fallback to legacy emit (slow) for sessions without a channel
            #[derive(serde::Serialize, Clone)]
            struct FramePayload {
                w: usize,
                h: usize,
                data: Vec<u8>,
            }
            self.emit("video-frame", FramePayload {
                w: rgba.w,
                h: rgba.h,
                data: rgba.raw.clone(),
            });
        }
    }

    fn msgbox(&self, msgtype: &str, title: &str, text: &str, _link: &str, _retry: bool) {
        println!("💬 [Session {}] MSGBOX: [{}] ({}) {}", self.remote_id, msgtype, title, text);
        
        #[derive(serde::Serialize, Clone)]
        struct MsgPayload {
            id: String,
            msgtype: String,
            title: String,
            text: String,
        }
        self.emit("msgbox", MsgPayload {
            id: self.remote_id.clone(),
            msgtype: msgtype.to_string(),
            title: title.to_string(),
            text: text.to_string(),
        });
    }


    fn cancel_msgbox(&self, _tag: &str) {}

    fn switch_back(&self, _id: &str) {}

    fn portable_service_running(&self, _running: bool) {}

    fn on_voice_call_started(&self) {}

    fn on_voice_call_closed(&self, _reason: &str) {}

    fn on_voice_call_waiting(&self) {}

    fn on_voice_call_incoming(&self) {}

    fn get_rgba(&self, _display: usize) -> *const u8 { std::ptr::null() }

    fn next_rgba(&self, _display: usize) {}

    fn set_multiple_windows_session(&self, _sessions: Vec<WindowsSession>) {}

    fn set_current_display(&self, disp_idx: i32) {
        println!("🖥️ [Tauri Handler] Current display changed to: {}", disp_idx);
        self.emit("current-display-changed", disp_idx);
    }

    fn update_record_status(&self, _start: bool) {}

    fn update_empty_dirs(&self, _res: ReadEmptyDirsResponse) {}

    fn printer_request(&self, _id: i32, _path: String) {}

    fn handle_screenshot_resp(&self, _sid: String, _msg: String) {}

    fn handle_terminal_response(&self, _response: TerminalResponse) {}

    fn clipboard(&self, content: String) {
        self.emit("remote-clipboard", content);
    }

    fn needs_software_decoding(&self) -> bool {
        // Set to false to send encoded frames to WebCodecs in frontend
        // Set to true to decode in Rust and send RGBA pixels (slower but guaranteed to work)
        false
    }

    fn on_encoded_frame(&self, _display: usize, format: CodecFormat, frame: EncodedVideoFrame) {
        // Send encoded frame to JS for WebCodecs hardware decoding
        use std::sync::atomic::{AtomicU64, Ordering};
        static FRAME_COUNT: AtomicU64 = AtomicU64::new(0);
        
        let count = FRAME_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
        if count % 60 == 1 {
            println!("🗾 [WebCodecs] Encoded frame #{}: {:?}, size={}, key={}",
                count, format, frame.data.len(), frame.key);
        }

        let clean_id = self.remote_id.trim().to_string();
        let mut failed_to_send = false;

        if let Ok(mut channels) = crate::VIDEO_CHANNELS.lock() {
            if let Some((channel, _nonce)) = channels.get(&clean_id) {
                // Binary format: [1 byte: format][1 byte: is_key][8 bytes: PTS][N bytes: data]
                let format_byte = match format {
                    CodecFormat::VP8 => 0u8,
                    CodecFormat::VP9 => 1u8,
                    CodecFormat::H264 => 2u8,
                    CodecFormat::H265 => 3u8,
                    CodecFormat::AV1 => 4u8,
                    _ => 255u8,
                };
                if format_byte == 255 { return; }

                if count % 60 == 1 {
                    println!("🗾 [WebCodecs] Dispatching frame to JS channel (v{}) for {}: format={}, key={}", _nonce, clean_id, format_byte, frame.key);
                }

                let mut binary = Vec::with_capacity(10 + frame.data.len());
                binary.push(format_byte);
                binary.push(if frame.key { 1 } else { 0 });
                binary.extend_from_slice(&frame.pts.to_le_bytes());
                binary.extend_from_slice(&frame.data);

                if let Err(_) = channel.send(tauri::ipc::InvokeResponseBody::Raw(binary)) {
                    failed_to_send = true;
                }
            }
            
            // Auto-Pruning: Remove stale channel if send failed (e.g. page was reloaded)
            if failed_to_send {
                println!("🧹 [WebCodecs] Pruning STALE channel for peer: '{}'", clean_id);
                channels.remove(&clean_id);
            }
        }
    }
}
