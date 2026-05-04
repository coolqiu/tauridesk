use crate::commands::session::{ACTIVE_SESSIONS, SESSION_SENDERS};
use crate::session_handler::TauriHandler;
use hbb_common::config::Status;
use hbb_common::message_proto::*;
use librustdesk::ui_session_interface::Session;
use librustdesk::client::{Data, Interface};
use hbb_common::protobuf::{MessageField, EnumOrUnknown};

#[derive(Clone, Copy, serde::Deserialize)]
pub struct BrowserCodecs {
    vp8: bool,
    vp9: bool,
    h264: bool,
    h265: bool,
    av1: bool,
}

#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, h265: bool, av1: bool) -> Result<(), String> {
    // 1. Persist to status
    let codec_json = serde_json::json!({
        "vp8": vp8, "vp9": vp9, "h264": h264, "h265": h265, "av1": av1,
    }).to_string();
    Status::set("browser-supported-codecs", codec_json);

    let codecs = BrowserCodecs { vp8, vp9, h264, h265, av1 };

    // 2. Update all active sessions
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    for (id, session) in sessions.iter() {
        apply_browser_supported_codecs(session, codecs);
        notify_supported_decoding(session, codecs);
        request_refresh_video(id, 0);
        request_refresh_video(id, 150);
    }

    Ok(())
}

pub fn apply_cached_browser_supported_codecs(id: &str, session: &Session<TauriHandler>) {
    let cached = Status::get("browser-supported-codecs");
    if cached.is_empty() {
        return;
    }
    let Ok(codecs) = serde_json::from_str::<BrowserCodecs>(&cached) else {
        return;
    };
    apply_browser_supported_codecs(session, codecs);
    notify_supported_decoding(session, codecs);
    request_refresh_video(id, 0);
    request_refresh_video(id, 150);
}

fn apply_browser_supported_codecs(session: &Session<TauriHandler>, codecs: BrowserCodecs) {
    let mut lc = session.lc.write().unwrap();
    lc.supported_encoding.vp8 = codecs.vp8;
    lc.supported_encoding.h264 = codecs.h264;
    lc.supported_encoding.h265 = codecs.h265;
    lc.supported_encoding.av1 = codecs.av1;
        
    if let Some(i444) = lc.supported_encoding.i444.as_mut() {
        i444.vp9 = codecs.vp9;
    } else {
        let mut i444 = CodecAbility::new();
        i444.vp9 = codecs.vp9;
        lc.supported_encoding.i444 = MessageField::some(i444);
    }
}

fn notify_supported_decoding(session: &Session<TauriHandler>, codecs: BrowserCodecs) {
    let mut sd = SupportedDecoding::new();
    sd.ability_vp8 = if codecs.vp9 || codecs.av1 || codecs.h264 || codecs.h265 { 0 } else { 50 };
    if codecs.vp9 { sd.ability_vp9 = 90; }
    if codecs.h264 { sd.ability_h264 = 80; }
    if codecs.h265 { sd.ability_h265 = 85; }
    if codecs.av1 { sd.ability_av1 = 100; }
    
    if codecs.h265 {
        sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::H265);
    } else if codecs.h264 {
        sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::H264);
    } else if codecs.vp8 {
        sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::VP8);
    } else if codecs.vp9 {
        sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::VP9);
    } else if codecs.av1 {
        sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::AV1);
    }

    let mut option_msg = OptionMessage::new();
    option_msg.supported_decoding = MessageField::some(sd);
    
    let mut misc = Misc::new();
    misc.set_option(option_msg);
    
    let mut msg = Message::new();
    msg.set_misc(misc);
    
    session.send(Data::Message(msg));
}

pub fn request_refresh_video(id: &str, delay_ms: u64) {
    let id_clone = id.to_string();
    std::thread::spawn(move || {
        if delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        }
        let senders = SESSION_SENDERS.lock().unwrap();
        if let Some(tx) = senders.get(&id_clone) {
            let mut misc = Misc::new();
            misc.set_refresh_video(true);
            let mut m = Message::new();
            m.set_misc(misc);
            let _ = tx.send(Data::Message(m));
        }
    });
}
