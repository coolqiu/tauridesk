import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { 
  Shield, Keyboard, ClipboardList, Volume2, FileUp, 
  RotateCcw, Video, Ban, X
} from 'lucide-react';
import '../index.css';

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
    console.log('🛡️ [Tauri Auth] Starting listener for connection-authorized event');
    const unlistenPromise = listen('connection-authorized', (event: any) => {
      if (Number(event.payload.id) === Number(id)) {
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
    try {
      await invoke('authorize_connection', { 
        id: Number(id),
        perms: permissions
      });
    } finally {
      await getCurrentWebviewWindow().close();
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await invoke('reject_connection', { id: Number(id) });
    } finally {
      await getCurrentWebviewWindow().close();
    }
  };

  return (
    <div className="flex-col h-screen w-screen overflow-hidden bg-[var(--rd-bg-scaffold)]">
      {/* 1. Header Area */}
      <div className="rd-titlebar" style={{ padding: '0 20px' }}>
          <div className="flex-row gap-3">
             <div className="m-blue"><Shield size={20} /></div>
             <span style={{ fontSize: '14px', fontWeight: 600 }}>申请连接</span>
          </div>
          <button className="rd-window-control hover-red" onClick={handleReject}>
             <X size={18} />
          </button>
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 flex-col p-[30px] overflow-y-auto custom-scrollbar">
          <div className="flex-row gap-5 mb-8">
              <div className="rd-peer-icon" style={{ width: '64px', height: '64px', fontSize: '32px' }}>
                  {name.charAt(0) || peer_id.charAt(0) || '?'}
              </div>
              <div className="flex-col">
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{name || "未知用户"}</h2>
                  <span style={{ fontSize: '13px', color: 'var(--rd-text-secondary)' }}>ID: {peer_id}</span>
              </div>
          </div>

          <div className="rd-panel-desc" style={{ marginBottom: '15px', fontWeight: 600 }}>权限设置</div>
          
          <div className="rs-flat-card" style={{ margin: '0 0 30px 0', padding: '20px' }}>
              <div className="grid grid-cols-2 gap-4">
                  {pItems.map(item => (
                    <label key={item.key} className="rs-checkbox" style={{ marginBottom: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={(permissions as any)[item.key]} 
                          onChange={() => togglePermission(item.key)} 
                        />
                        <div className="box"></div>
                        <div className="flex-row gap-2">
                           <item.icon size={16} style={{ opacity: 0.6 }} />
                           <span>{item.label}</span>
                        </div>
                    </label>
                  ))}
              </div>
          </div>

          <div className="flex-row gap-4 mt-auto">
              <button 
                className="rs-btn-blue" 
                style={{ flex: 1, height: '44px', background: '#F1F3F4', color: '#202124', boxShadow: 'none' }}
                onClick={handleReject}
                disabled={isProcessing}
              >
                  拒绝
              </button>
              <button 
                className="rs-btn-blue" 
                style={{ flex: 1, height: '44px' }}
                onClick={handleAccept}
                disabled={isProcessing}
              >
                  接受
              </button>
          </div>
      </div>

      <div className="p-4 border-t border-[var(--rd-border)] flex-row justify-between text-[11px] text-[var(--rd-text-secondary)] opacity-60">
          <span>注意：接受后对方将完全控制此设备</span>
          <span>RustDesk Industrial</span>
      </div>
    </div>
  );
}
