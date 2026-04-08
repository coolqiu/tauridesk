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
  const { fetchServerState, fetchOptions } = useServerStore();
  const { fetchPeers } = usePeerStore();

  useEffect(() => {
    fetchServerState();
    fetchPeers();
    fetchOptions(['theme', 'enable-hwcodec', 'codec-priority', 'enable-abr']);
    
    // TEMPORARILY DISABLED TO STOP RUST STACK OVERFLOW
    /*
    const interval = setInterval(() => {
      fetchServerState();
    }, 5000);

    return () => clearInterval(interval);
    */
  }, [fetchServerState, fetchPeers, fetchOptions]);

  return (
    <div className="flex-col h-screen w-screen overflow-hidden bg-[var(--rd-bg-scaffold)]">
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="main-layout flex-1">
        {activeTab === 'home' && (
          <div className="flex-row flex-1 h-full w-full">
            <LocalPanel />
            <div className="workspace-area flex-1">
              <RemotePanel />
            </div>
          </div>
        )}

        {activeTab === 'address-book' && <AddressBook />}
        
        {activeTab === 'settings' && (
          <SettingsLayout>
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
