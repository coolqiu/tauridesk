import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { 
  Shield, Keyboard, ClipboardList, Volume2, FileUp, 
  RotateCcw, Video, Ban 
} from 'lucide-react';
import '../App.css';

export default function AuthorizeWindow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const peer_id = searchParams.get('peer_id') || '';
  const name = searchParams.get('name') || '';

  const [permissions, setPermissions] = useState({
    keyboard: true,
    clipboard: true,
    audio: true,
    file: true,
    restart: true,
    recording: true,
    block_input: true,
  });

  useEffect(() => {
    // [Phase 43] Auto-close window if connection is authorized elsewhere (e.g. password success)
    console.log('🛡️ [Tauri Auth] Starting listener for connection-authorized event');
    const unlistenPromise = listen('connection-authorized', (event: any) => {
      console.log('🛡️ [Tauri Auth] Received authorization event:', event.payload);
      if (Number(event.payload.id) === Number(id)) {
        console.log('✅ [Tauri Auth] Match found for ID', id, '. Closing window.');
        getCurrentWebviewWindow().close();
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [id]);

  const togglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  const pItems = [
    { key: 'recording', icon: Video, label: 'Screen' },
    { key: 'keyboard', icon: Keyboard, label: 'Keyboard' },
    { key: 'clipboard', icon: ClipboardList, label: 'Clipboard' },
    { key: 'audio', icon: Volume2, label: 'Audio' },
    { key: 'file', icon: FileUp, label: 'File' },
    { key: 'restart', icon: RotateCcw, label: 'Restart' },
    { key: 'block_input', icon: Ban, label: 'Block Input' },
  ];

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    console.log('🛡️ [Tauri Auth] Authorizing connection for ID:', id, 'with perms:', permissions);
    try {
      await invoke('authorize_connection', { 
        id: Number(id),
        perms: permissions
      });
    } catch (error) {
      console.error('❌ [Tauri Auth] Authorization failed:', error);
      setIsProcessing(false);
    } finally {
      // Ensure window closes even if invoke has issues
      await getCurrentWebviewWindow().close();
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    console.log('🔴 [Tauri Auth] Reject clicked for ID:', id);
    try {
      await invoke('reject_connection', { id: Number(id) });
    } catch (error) {
      console.error("❌ [Tauri Auth] Failed to reject:", error);
      setIsProcessing(false);
    } finally {
      await getCurrentWebviewWindow().close();
    }
  };

  return (
    <div className="authorize-window-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      pointerEvents: 'auto',
      position: 'relative',
      zIndex: 1
    }}>
      <div className="glass-panel modal-content box-anim" 
           onClick={e => e.stopPropagation()}
           style={{ 
        width: '100%', 
        maxWidth: '380px', 
        padding: '2rem',
        margin: '0 auto',
        background: '#fff',
        zIndex: 10,
        pointerEvents: 'auto'
      }}>
        <div className="modal-header">
          <Shield size={32} style={{ color: '#3b82f6' }} className="mb-2" />
          <h3 className="text-xl font-bold" style={{ color: '#0f172a' }}>Incoming Connection</h3>
          <p className="text-muted text-sm mt-2">{peer_id}</p>
        </div>
        
        <div className="peer-info-box mt-4 p-4 rounded-xl bg-slate-50 w-full flex items-center gap-4">
          <div className="peer-avatar large">{name.charAt(0) || peer_id.charAt(0)}</div>
          <div className="flex-col">
            <span className="font-bold text-lg" style={{ color: '#0f172a' }}>{name || "Unknown User"}</span>
            <span className="text-xs text-muted">Requesting access...</span>
          </div>
        </div>

        <div className="permissions-section mt-6">
          <span className="permissions-label text-center block mb-2" style={{ color: '#94a3b8' }}>Permissions</span>
          <div className="permissions-grid">
            {pItems.map(item => {
              const IconComp = item.icon;
              const isActive = (permissions as any)[item.key];
              return (
              <div 
                key={item.key}
                className={`permission-item ${isActive ? 'active' : 'inactive'}`}
                onClick={(e) => { e.stopPropagation(); togglePermission(item.key); }}
                title={item.label}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#3b82f6' : 'rgba(0, 0, 0, 0.05)',
                  boxShadow: isActive ? '0 4px 12px rgba(55, 125, 255, 0.3)' : 'none',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  pointerEvents: 'auto'
                }}
              >
                <IconComp 
                  size={20} 
                  strokeWidth={2.5} 
                  color={isActive ? '#ffffff' : '#94a3b8'} 
                />
              </div>
              );
            })}
          </div>
        </div>

        <div className="modal-actions mt-8 flex gap-4 w-full">
          <button className="btn btn-secondary flex-1 h-12" 
                  disabled={isProcessing}
                  style={{ pointerEvents: 'auto', zIndex: 20, background: isProcessing ? '#e2e8f0' : '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  onClick={(e) => { e.stopPropagation(); handleReject(); }}>
            Reject
          </button>
          <button className="btn btn-primary flex-1 h-12 shadow-btn" 
                  disabled={isProcessing}
                  style={{ pointerEvents: 'auto', zIndex: 20, opacity: isProcessing ? 0.7 : 1, background: '#3b82f6', color: '#fff', border: 'none' }}
                  onClick={(e) => { e.stopPropagation(); handleAccept(); }}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
