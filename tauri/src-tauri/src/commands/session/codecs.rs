use crate::commands::session::{ACTIVE_SESSIONS, SESSION_SENDERS};
use hbb_common::config::Status;
use hbb_common::message_proto::*;
use librustdesk::client::{Data, Interface};
use hbb_common::protobuf::{MessageField, EnumOrUnknown};

#[tauri::command]
pub async fn set_browser_supported_codecs(vp8: bool, vp9: bool, h264: bool, h265: bool, av1: bool) -> Result<(), String> {
    // 1. Persist to status
    let codec_json = serde_json::json!({
        "vp8": vp8, "vp9": vp9, "h264": h264, "h265": h265, "av1": av1,
    }).to_string();
    Status::set("browser-supported-codecs", codec_json);

    // 2. Update all active sessions
    let sessions = ACTIVE_SESSIONS.lock().unwrap();
    for (id, session) in sessions.iter() {
        {
            let mut lc = session.lc.write().unwrap();
            lc.supported_encoding.vp8 = vp8;
            lc.supported_encoding.h264 = h264;
            lc.supported_encoding.h265 = h265;
            lc.supported_encoding.av1 = av1;
            
            if let Some(i444) = lc.supported_encoding.i444.as_mut() {
                i444.vp9 = vp9;
            } else {
                let mut i444 = CodecAbility::new();
                i444.vp9 = vp9;
                lc.supported_encoding.i444 = MessageField::some(i444);
            }
        }

        // 3. Notify peer with SupportedDecoding message
        let mut sd = SupportedDecoding::new();
        sd.ability_vp8 = if vp9 || av1 || h264 || h265 { 0 } else { 50 };
        if vp9 { sd.ability_vp9 = 90; }
        if h264 { sd.ability_h264 = 80; }
        if h265 { sd.ability_h265 = 85; }
        if av1 { sd.ability_av1 = 100; }
        
        if h265 {
            sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::H265);
        } else if h264 {
            sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::H264);
        } else if vp8 {
            sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::VP8);
        } else if vp9 {
            sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::VP9);
        } else if av1 {
            sd.prefer = EnumOrUnknown::new(supported_decoding::PreferCodec::AV1);
        }

        let mut option_msg = OptionMessage::new();
        option_msg.supported_decoding = MessageField::some(sd);
        
        let mut misc = Misc::new();
        misc.set_option(option_msg);
        
        let mut msg = Message::new();
        msg.set_misc(misc);
        
        session.send(Data::Message(msg));

        // 4. Force video refresh
        let id_clone = id.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
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

    Ok(())
}
