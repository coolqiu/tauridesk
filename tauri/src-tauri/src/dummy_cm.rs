use librustdesk::ui_cm_interface::{InvokeUiCM, Client};

#[derive(Clone)]
pub struct DummyUiCM;

impl InvokeUiCM for DummyUiCM {
    fn add_connection(&self, _client: &Client) {}
    fn remove_connection(&self, _id: i32, _close: bool) {}
    fn new_message(&self, _id: i32, _text: String) {}
    fn change_theme(&self, _dark: String) {}
    fn change_language(&self) {}
    fn show_elevation(&self, _show: bool) {}
    fn update_voice_call_state(&self, _client: &Client) {}
    fn file_transfer_log(&self, _action: &str, _log: &str) {}
}
