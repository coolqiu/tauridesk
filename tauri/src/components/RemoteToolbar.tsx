import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Monitor, Keyboard, Zap, ChevronDown, 
  RefreshCcw, MousePointer2, Maximize, 
  Minimize, Scaling, FileText, Settings,
  MessageSquare, ExternalLink
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface RemoteToolbarProps {
  id: string;
  onViewModeChange: (mode: 'contain' | 'cover' | 'original') => void;
  viewMode: 'contain' | 'cover' | 'original';
  displays?: any[];
  currentDisplay?: number;
}

export default function RemoteToolbar({ id, onViewModeChange, viewMode, displays = [], currentDisplay = 0 }: RemoteToolbarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number, left: number } | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenu === menuId) {
      setActiveMenu(null);
      setMenuPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, left: rect.left });
      setActiveMenu(menuId);
    }
  };

  useEffect(() => {
    const handleMouseTop = (e: MouseEvent) => {
      if (isPinned) return;
      if (e.clientY < 10) setIsVisible(true);
      else if (e.clientY > 60 && !activeMenu) setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseTop);
    return () => window.removeEventListener('mousemove', handleMouseTop);
  }, [isPinned, activeMenu]);

  const closeMenus = () => {
    setActiveMenu(null);
    setMenuPos(null);
  };

  const menuItems = {
    display: [
      { label: '缩放: 等比例', active: viewMode === 'contain', onClick: () => onViewModeChange('contain'), icon: <Scaling size={14}/> },
      { label: '缩放: 原始尺寸', active: viewMode === 'original', onClick: () => onViewModeChange('original'), icon: <Maximize size={14}/> },
      { divider: true },
      // Dynamic Monitor List
      ...displays.map((_d, idx) => ({
        label: `显示器 ${idx + 1}`,
        active: currentDisplay === idx,
        onClick: () => invoke('switch_display', { id, display: idx }),
        icon: <Monitor size={14} />
      })),
      { divider: true },
      { label: '刷新画面', onClick: () => invoke('refresh_video', { id }), icon: <RefreshCcw size={14}/> },
      { label: '显示远程光标', active: true, icon: <MousePointer2 size={14}/> },
    ],
    input: [
        { label: '允许控制', active: true, icon: <Keyboard size={14}/> },
        { label: '锁定键盘与鼠标', active: false, onClick: () => invoke('set_remote_option', { id, key: 'lock-kb', value: 'Y' }), icon: <Minimize size={14}/> },
        { divider: true },
        { label: '映射键盘模式', active: true },
        { label: '传统键盘模式', active: false },
    ],
    actions: [
        { label: '发送 Ctrl+Alt+Del', onClick: () => invoke('send_ctrl_alt_del', { id }), icon: <ExternalLink size={14}/> },
        { label: '锁定远程计算机', onClick: () => invoke('set_remote_option', { id, key: 'lock-remote', value: 'Y' }), icon: <Minimize size={14}/> },
        { label: '显示桌面', icon: <Monitor size={14}/> },
        { divider: true },
        { label: '禁止用户输入', active: false, onClick: () => invoke('set_remote_option', { id, key: 'block-input', value: 'Y' }) },
    ]
  };

  return (
    <>
      <div 
        ref={toolbarRef}
        className={`rd-session-toolbar ${isVisible || isPinned ? 'visible' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          background: 'rgba(26, 26, 26, 0.95)',
          border: '1px solid #333',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          zIndex: 1000,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          transition: 'transform 0.2s ease-out, opacity 0.2s',
          opacity: isVisible || isPinned ? 1 : 0,
          pointerEvents: isVisible || isPinned ? 'auto' : 'none',
          marginTop: isVisible || isPinned ? '0' : '-40px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="toolbar-section">
            <button className={`toolbar-btn ${activeMenu === 'display' ? 'active' : ''}`} onClick={(e) => toggleMenu('display', e)}>
                <Monitor size={16} /> <span>显示</span> <ChevronDown size={12} />
            </button>
            <button className={`toolbar-btn ${activeMenu === 'input' ? 'active' : ''}`} onClick={(e) => toggleMenu('input', e)}>
                <Keyboard size={16} /> <span>输入</span> <ChevronDown size={12} />
            </button>
            <button className={`toolbar-btn ${activeMenu === 'actions' ? 'active' : ''}`} onClick={(e) => toggleMenu('actions', e)}>
                <Zap size={16} /> <span>操作</span> <ChevronDown size={12} />
            </button>
        </div>
        
        <div style={{ width: '1px', height: '18px', background: '#333', margin: '0 8px' }} />

        <div className="toolbar-section">
            <button className="toolbar-btn" title="查看消息" onClick={() => {}}>
                <MessageSquare size={16} />
            </button>
            <button className="toolbar-btn" title="显示器切换" onClick={() => {}}>
                <Maximize size={16} />
            </button>
            <button className="toolbar-btn" title="文件传输" onClick={() => {}}>
                <FileText size={16} />
            </button>
            <button className="toolbar-btn" title="设置" onClick={() => {}}>
                <Settings size={16} />
            </button>
        </div>

        <button 
           className="toolbar-pin" 
           style={{ color: isPinned ? 'var(--rd-accent)' : '#888', marginLeft: '10px' }}
           onClick={() => setIsPinned(!isPinned)}
        >
            <div style={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(-45deg)', transition: '0.2s' }}>📌</div>
        </button>
      </div>

      {activeMenu && menuPos && createPortal(
        <div 
            ref={menuRef} 
            className="rd-dropdown rs-portal-dropdown show dark" 
            style={{ 
                position: 'fixed', 
                top: menuPos.top, 
                left: menuPos.left,
                background: '#1E1E1E',
                border: '1px solid #333',
                minWidth: '180px'
            }}
            onClick={closeMenus}
        >
            {menuItems[activeMenu as keyof typeof menuItems]?.map((item: any, idx) => (
                item.divider ? <div key={idx} className="rd-menu-divider" style={{ background: '#333' }} /> : (
                    <div key={idx} className="rd-menu-item" onClick={item.onClick} style={{ color: '#EEE' }}>
                        <div className="flex-row gap-3">
                            {item.icon}
                            <span>{item.label}</span>
                        </div>
                        {item.active !== undefined && (
                            <div className={`m-dot ${item.active ? 'active' : ''}`} style={{ borderColor: '#444' }} />
                        )}
                    </div>
                )
            ))}
        </div>,
        document.body
      )}

      <style>{`
        .toolbar-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 4px;
            color: #AAA;
            font-size: 13px;
            transition: 0.2s;
        }
        .toolbar-btn:hover {
            background: rgba(255,255,255,0.05);
            color: #FFF;
        }
        .toolbar-btn.active {
            background: var(--rd-accent);
            color: #FFF;
        }
        .toolbar-section {
            display: flex;
            gap: 2px;
        }
        .toolbar-pin {
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .rd-menu-item:hover {
            background: #2A2A2A !important;
        }
      `}</style>
    </>
  );
}
