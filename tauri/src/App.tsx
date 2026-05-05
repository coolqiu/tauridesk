import { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import LocalPanel from './components/LocalPanel';
import RemotePanel from './components/RemotePanel';
import SettingsLayout from './components/settings/SettingsLayout';
import AddressBook from './components/AddressBook';
import { useServerStore } from './store/serverStore';
import { usePeerStore } from './store/peerStore';
import GeneralTab from './components/settings/tabs/GeneralTab';
import SecurityTab from './components/settings/tabs/SecurityTab';
import NetworkTab from './components/settings/tabs/NetworkTab';
import DisplayTab from './components/settings/tabs/DisplayTab';
import AccountTab from './components/settings/tabs/AccountTab';
import PluginTab from './components/settings/tabs/PluginTab';
import PrinterTab from './components/settings/tabs/PrinterTab';
import AboutTab from './components/settings/tabs/AboutTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const { fetchServerState, fetchOptions, fetchLocalOptions } = useServerStore();
  const { fetchPeers } = usePeerStore();

  useEffect(() => {
    fetchServerState();
    fetchPeers();
    fetchLocalOptions(['theme', 'lang', 'toolbar-pinned']);
    fetchOptions([
      'enable-hwcodec',
      'enable-abr',
      'allow-remove-wallpaper',
      'enable-open-new-connections-in-tabs',
      'use-texture-render',
      'allow-d3d-render',
      'enable-check-update',
      'allow-auto-update',
      'enable-directx-capture',
      'enable-udp-punch',
      'enable-ipv6-punch',
      'keep-awake-during-outgoing-sessions',
      'allow-ask-for-note',
      'allow-auto-record-incoming',
      'allow-auto-record-outgoing',
      'view_style',
      'scroll_style',
      'image_quality',
      'codec-preference',
      'trackpad-speed',
      'enable-keyboard',
      'enable-tunnel',
      'enable-remote-printer',
      'enable-remote-restart',
      'enable-clipboard',
      'enable-record-session',
      'enable-file-transfer',
      'enable-block-input',
      'enable-audio',
      'allow-remote-config-modification',
      'enable-camera',
      'enable-terminal',
      'verification-method',
      'approve-mode',
      'custom-rendezvous-server',
      'relay-server',
      'api-server',
      'key',
      'proxy-url',
      'proxy-username',
      'proxy-password',
      'allow-websocket',
    ]);
    
    // 每 8 秒轮询服务器状态（ID / 密码及连接状态）
    // get_server_state 已改为 async + spawn_blocking，不会造成堆栈溢出
    const interval = setInterval(() => {
      fetchServerState();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchServerState, fetchPeers, fetchOptions, fetchLocalOptions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--rd-bg-scaffold)' }}>
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0 }}>
            <LocalPanel onOpenSettings={(tab) => { setActiveSettingsTab(tab); setActiveTab('settings'); }} />
            <div className="workspace-area flex-1">
              <RemotePanel />
            </div>
          </div>
        )}

        {activeTab === 'address-book' && <AddressBook />}
        
        {activeTab === 'settings' && (
          <SettingsLayout activeTab={activeSettingsTab} onTabChange={setActiveSettingsTab}>
             {(at) => {
               switch (at) {
                  case 'general': return <GeneralTab />;
                  case 'security': return <SecurityTab />;
                  case 'network': return <NetworkTab />;
                  case 'display': return <DisplayTab />;
                  case 'account': return <AccountTab />;
                  case 'plugins': return <PluginTab />;
                  case 'printer': return <PrinterTab />;
                  case 'about': return <AboutTab />;
                  default: return <div className="p-8 text-secondary">Tab {at} 正在开发中...</div>;
               }
             }}
          </SettingsLayout>
        )}
      </main>
    </div>
  );
}
