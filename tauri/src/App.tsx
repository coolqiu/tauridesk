import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  RefreshCw, Monitor, Zap, Settings, Shield, Clock, Search, 
  MoreVertical, Heart, MonitorPlay
} from 'lucide-react';
import { useServerStore } from './store/serverStore';
import { usePeerStore } from './store/peerStore';
import './App.css';

function App() {
  const { id, temporary_password, fetchServerState, refreshPassword, is_service_running, connect_status } = useServerStore();
  const { recentPeers, favoriteIds, fetchPeers, toggleFavorite } = usePeerStore();
  const [remoteId, setRemoteId] = useState('');

  useEffect(() => {
    fetchServerState();
    fetchPeers();
    
    const interval = setInterval(() => {
      fetchServerState();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchServerState, fetchPeers]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteId.trim()) return;
    try {
      await invoke('connect_to_peer', { id: remoteId, password: null });
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div className="app-container">
      <div className="dynamic-bg">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
      </div>

      <div className="main-layout flex">
        <section className="left-panel flex-col gap-6">
          <header className="flex justify-between items-center px-2 py-4">
            <div className="flex items-center gap-2 logo-container">
              <div className="logo-icon-wrap">
                <Monitor color="white" size={24} />
              </div>
              <h1 className="logo-text">RustDesk <span className="logo-badge">Tauri</span></h1>
            </div>
            <div className="flex gap-2">
              <button className="icon-btn soft"><Settings size={18} /></button>
            </div>
          </header>

          <div className="glass-panel main-card">
            <div className="card-header flex justify-between items-center">
              <h2 className="card-title flex items-center gap-2">
                <Shield size={18} className="text-brand" /> 
                Your Desktop
              </h2>
              <div className={`service-badge ${connect_status === 1 ? 'connected' : (is_service_running ? 'ready' : 'offline')}`}>
                <div className="status-dot"></div>
                <span>{connect_status === 1 ? 'Connected' : (is_service_running ? 'Ready' : 'Service Offline')}</span>
              </div>
            </div>
            
            <div className="card-content flex-col gap-4 mt-6">
              <div className="info-group box-anim">
                <label>ID</label>
                <div className="copy-field">
                  <span className="value text-xl font-bold font-mono tracking-wider">{id || '---------'}</span>
                </div>
              </div>

              <div className="info-group box-anim" style={{ animationDelay: '0.1s' }}>
                <label>One-time Password</label>
                <div className="copy-field">
                  <span className="value font-mono tracking-wider">{temporary_password}</span>
                  <button onClick={refreshPassword} className="icon-btn hover-spin"><RefreshCw size={16} /></button>
                </div>
              </div>

              <div className="action-row mt-4 flex gap-4">
                <button className="btn btn-secondary w-full">Set Password</button>
                <button className="btn btn-secondary w-full">Security Rules</button>
              </div>
            </div>
          </div>
          
          <div className="glass-panel support-card flex items-center gap-4">
              <div className="icon-square bg-warning-light">
                <Zap size={24} className="text-warning" />
              </div>
              <div className="flex-col">
                <span className="font-semibold text-sm">Need help?</span>
                <span className="text-xs text-muted">Join our Discord community or check the documentation.</span>
              </div>
          </div>
        </section>

        <section className="right-panel flex-col">
          <div className="glass-panel remote-control-card flex-col gap-4">
            <h2 className="card-title flex items-center gap-2">
              <MonitorPlay size={20} className="text-success" />
              Control Remote Desktop
            </h2>
            <form onSubmit={handleConnect} className="flex gap-2 mt-2">
              <div className="input-with-icon flex-1">
                <Search size={18} className="input-icon text-muted" />
                <input 
                  type="text" 
                  className="input pl-10 h-14 text-lg font-mono placeholder:font-sans" 
                  placeholder="Enter Remote ID..."
                  value={remoteId}
                  onChange={e => setRemoteId(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary h-14 px-8 shadow-btn">
                Connect
              </button>
            </form>
          </div>

          <div className="recent-list-container flex-col mt-6 flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="section-title flex items-center gap-2">
                <Clock size={16} /> Recent Sessions
              </h3>
            </div>

            <div className="peer-list grid-cols-2 gap-4 auto-rows-max overflow-y-auto pr-2 pb-4">
              {recentPeers.length === 0 ? (
                <div className="empty-state text-center py-10 flex-col items-center gap-2 col-span-2">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <Monitor size={24} className="text-slate-300" />
                  </div>
                  <p className="text-muted text-sm">No recent connections</p>
                </div>
              ) : (
                recentPeers.map((peer, i) => {
                  const isFav = favoriteIds.includes(peer.id);
                  return (
                    <div className="peer-card glass-panel flex justify-between group" key={peer.id} style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex gap-3">
                        <div className="peer-avatar">
                          {peer.alias?.charAt(0) || peer.username?.charAt(0) || peer.id.charAt(0) || '?'}
                        </div>
                        <div className="flex-col justify-center">
                          <span className="font-semibold text-sm peer-name truncate max-w-[120px]">
                            {peer.alias || peer.username || peer.hostname || "Unknown"}
                          </span>
                          <span className="text-xs text-muted font-mono">{peer.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="icon-btn" onClick={() => toggleFavorite(peer.id)}>
                          <Heart size={16} className={isFav ? "fill-danger text-danger" : ""} />
                        </button>
                        <button className="icon-btn">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
