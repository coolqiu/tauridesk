import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Monitor, Keyboard, Zap, ChevronDown,
  RefreshCcw, MousePointer2, Maximize,
  Minimize, Scaling, FileText,
  ExternalLink, Lock, Maximize2, Minimize2, Activity,
  MoreVertical, ChevronUp, Pin
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface RemoteToolbarProps {
  id: string;
  onViewModeChange: (mode: 'contain' | 'cover' | 'original') => void;
  viewMode: 'contain' | 'cover' | 'original';
  displays?: any[];
  currentDisplay?: number;
  showRemoteCursor?: boolean;
  setShowRemoteCursor?: (show: boolean) => void;
  remoteOptions?: Record<string, boolean>;
  onShowQualityPanel?: () => void;
  onRemoteOptionChange?: (key: string, value: boolean) => void;
}

export default function RemoteToolbar({ id, onViewModeChange, viewMode, displays = [], currentDisplay = 0, showRemoteCursor = true, setShowRemoteCursor = () => {}, remoteOptions = {}, onShowQualityPanel, onRemoteOptionChange }: RemoteToolbarProps) {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number, left: number } | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<{ top: number, left: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load pinned state, collapsed state and position from storage on mount
  useEffect(() => {
    invoke<boolean>('get_local_option', { key: 'toolbar-pinned' })
      .then(saved => setIsPinned(saved))
      .catch(() => setIsPinned(false));

    const savedCollapsed = localStorage.getItem('rustdesk-toolbar-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }

    const savedPos = localStorage.getItem('rustdesk-toolbar-position');
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch {
        setPosition(null);
      }
    }
  }, []);

  // Save pinned state when changed
  useEffect(() => {
    invoke('set_local_option', { key: 'toolbar-pinned', value: isPinned })
      .catch(() => {});
  }, [isPinned]);

  // Save collapsed state when changed
  useEffect(() => {
    localStorage.setItem('rustdesk-toolbar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Save position when changed
  useEffect(() => {
    if (position) {
      localStorage.setItem('rustdesk-toolbar-position', JSON.stringify(position));
    }
  }, [position]);

  const toggleFullscreen = async () => {
    const window = getCurrentWindow();
    const newFullscreen = !isFullscreen;
    await window.setFullscreen(newFullscreen);
    setIsFullscreen(newFullscreen);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPinned) return; // Only allow dragging when pinned
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (position?.left ?? 0),
      y: e.clientY - (position?.top ?? 0)
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newLeft = e.clientX - dragStart.x;
    const newTop = e.clientY - dragStart.y;
    setPosition({ top: newTop, left: newLeft });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

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
    if (!activeMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolbarRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeMenu]);

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

  const setRemoteOption = (key: string, value: boolean) => {
    onRemoteOptionChange?.(key, value);
    invoke('set_remote_option', { id, key, value: value ? 'Y' : 'N' }).catch(() => {
      onRemoteOptionChange?.(key, !value);
    });
  };

  const openFileTransfer = async () => {
    try {
      const connToken = await invoke<string | null>('get_session_conn_token', { id }).catch(() => null);
      await invoke('fs_connect', { id, password: null, connToken });
      await invoke('open_file_transfer_window', { id });
    } catch (e) {
      console.error('Failed to open file transfer:', e);
    }
  };

  const menuItems = {
    display: [
      { label: t('Scale: Contain'), active: viewMode === 'contain', onClick: () => onViewModeChange('contain'), icon: <Scaling size={14}/> },
      { label: t('Scale: Cover'), active: viewMode === 'cover', onClick: () => onViewModeChange('cover'), icon: <Maximize2 size={14}/> },
      { label: t('Scale: Original'), active: viewMode === 'original', onClick: () => onViewModeChange('original'), icon: <Maximize size={14}/> },
      { divider: true },
      // Dynamic Monitor List
      ...displays.map((_d, idx) => ({
        label: t('Display') + ` ${idx + 1}`,
        active: currentDisplay === idx,
        onClick: () => invoke('switch_display', { id, display: idx }),
        icon: <Monitor size={14} />
      })),
      { divider: true },
      { label: t('Refresh'), onClick: () => invoke('refresh_video', { id }), icon: <RefreshCcw size={14}/> },
      {
        label: t('Show Remote Cursor'),
        active: showRemoteCursor,
        onClick: () => {
          const next = !showRemoteCursor;
          setShowRemoteCursor(next);
          invoke('set_remote_option', { id, key: 'show-remote-cursor', value: next ? 'Y' : 'N' })
            .catch(() => setShowRemoteCursor(!next));
        },
        icon: <MousePointer2 size={14}/>,
        isToggle: true
      },
      { label: t('Session Quality'), onClick: onShowQualityPanel, icon: <Activity size={14}/> },
    ],
    input: [
        { label: t('Connect'), active: true, icon: <Keyboard size={14}/>, isToggle: true },
        { 
          label: t('Lock Remote'), 
          active: remoteOptions['lock-kb'], 
          onClick: () => setRemoteOption('lock-kb', !remoteOptions['lock-kb']), 
          icon: <Minimize size={14}/>, 
          isToggle: true 
        },
        { divider: true },
        { label: t('Mapped Keyboard'), active: true },
        { label: t('Legacy Keyboard'), active: false },
    ],
    actions: [
        { label: '发送 Ctrl+Alt+Del', onClick: () => invoke('send_ctrl_alt_del', { id }), icon: <ExternalLink size={14}/> },
        { label: t('Lock Remote'), onClick: () => setRemoteOption('lock-remote', true), icon: <Lock size={14}/> },
        { label: t('Privacy Mode'), active: remoteOptions['privacy-mode'], onClick: () => setRemoteOption('privacy-mode', !remoteOptions['privacy-mode']), icon: <Monitor size={14}/>, isToggle: true },
        { divider: true },
        { label: t('Block Input'), active: remoteOptions['block-input'], onClick: () => setRemoteOption('block-input', !remoteOptions['block-input']), isToggle: true },
    ]
  };

  return (
    <>
      {isCollapsed ? (
        // Collapsed state - only show small handle
        <div
          ref={toolbarRef}
          className="rd-session-toolbar-collapsed"
          style={{
            position: 'fixed',
            top: position?.top ?? 4,
            left: position?.left ?? 10,
            width: '28px',
            height: '28px',
            background: 'rgba(26, 26, 26, 0.95)',
            border: '1px solid #333',
            borderRadius: '4px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            cursor: isPinned ? 'move' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
          onMouseDown={isPinned ? handleMouseDown : undefined}
          onClick={() => setIsCollapsed(false)}
        >
          <MoreVertical size={16} />
        </div>
      ) : (
        // Expanded state - full toolbar
        <div
          ref={toolbarRef}
          className={`rd-session-toolbar ${isVisible || isPinned ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            position: 'fixed',
            top: position?.top ?? 0,
            left: position?.left ?? '50%',
            transform: position ? 'none' : 'translateX(-50%)',
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
            transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s',
            opacity: isVisible || isPinned ? 1 : 0,
            pointerEvents: isVisible || isPinned ? 'auto' : 'none',
            marginTop: isVisible || isPinned ? '0' : '-40px',
            cursor: isPinned ? 'move' : 'default',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onClick={e => e.stopPropagation()}
        >
          <div className="toolbar-section">
            <button className={`toolbar-btn ${activeMenu === 'display' ? 'active' : ''}`} onClick={(e) => toggleMenu('display', e)}>
              <Monitor size={16} /> <span>{t('Display')}</span> <ChevronDown size={12} />
            </button>
            <button className={`toolbar-btn ${activeMenu === 'input' ? 'active' : ''}`} onClick={(e) => toggleMenu('input', e)}>
              <Keyboard size={16} /> <span>{t('Input')}</span> <ChevronDown size={12} />
            </button>
            <button className={`toolbar-btn ${activeMenu === 'actions' ? 'active' : ''}`} onClick={(e) => toggleMenu('actions', e)}>
              <Zap size={16} /> <span>{t('Action')}</span> <ChevronDown size={12} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', background: '#333', margin: '0 8px' }} />

          <div className="toolbar-section">
            <button className="toolbar-btn" title={t('Fullscreen')} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="toolbar-btn" title={t('File Transfer')} onClick={openFileTransfer}>
              <FileText size={16} />
            </button>
          </div>

          <button
            className="toolbar-collapse-handle"
            style={{ color: '#888', marginLeft: '8px', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setIsCollapsed(true)}
            title={t('Collapse')}
          >
            <ChevronUp size={16} />
          </button>

          <button
             className="toolbar-pin"
             style={{ color: isPinned ? 'var(--rd-accent)' : '#888', marginLeft: '4px', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             onClick={() => setIsPinned(!isPinned)}
             title={t('Pin Toolbar')}
          >
            <Pin size={14} style={{ transform: isPinned ? 'rotate(0deg)' : 'rotate(-45deg)', transition: '0.2s' }} />
          </button>
        </div>
      )}

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
            onPointerDown={e => e.stopPropagation()}
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
                            item.isToggle ? (
                                <div className={`m-check ${item.active ? 'active' : ''}`} style={{ borderColor: '#444' }} />
                            ) : (
                                <div className={`m-dot ${item.active ? 'active' : ''}`} style={{ borderColor: '#444' }} />
                            )
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
        .m-check {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            border: 1px solid #CCC;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            position: relative;
        }
        .m-check.active {
            background: var(--rd-accent);
            border-color: var(--rd-accent) !important;
        }
        .m-check.active::after {
            content: "";
            width: 3px;
            height: 7px;
            border: solid white;
            border-width: 0 1.5px 1.5px 0;
            transform: rotate(45deg);
            margin-bottom: 2px;
        }
      `}</style>
    </>
  );
}
