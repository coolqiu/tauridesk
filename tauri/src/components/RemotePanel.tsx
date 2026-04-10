import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { 
  Monitor, Star, History, Compass, 
  User, Search, CheckSquare, 
  Menu, ChevronDown, MoreVertical, Trash2, 
  HelpCircle, Terminal, Camera, Cpu, 
  FileText, Pencil, Key
} from 'lucide-react';
import { usePeerStore } from '../store/peerStore';

export default function RemotePanel() {
  const [remoteId, setRemoteId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('recent');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number, left: number } | null>(null);
  const [isRelayForced, setIsRelayForced] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { recentPeers } = usePeerStore();

  const onConnect = (id: string | null) => {
    const targetId = id || remoteId;
    if (!targetId) return;
    invoke('connect_to_peer', { id: targetId }).catch(err => {
       console.error("Connection failed:", err);
    });
    setActiveMenuId(null);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenuId === id) {
      setActiveMenuId(null);
      setMenuPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      // Initial estimation, will be refined by useLayoutEffect
      setMenuPos({ top: rect.bottom + 5, left: rect.left - 100 });
      setActiveMenuId(id);
    }
  };

  useLayoutEffect(() => {
    if (activeMenuId && menuPos && menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;
        let { top, left } = menuPos;
        let adjusted = false;

        // Shift left if exceeding right edge
        if (left + rect.width > innerWidth) {
            left = innerWidth - rect.width - 15;
            adjusted = true;
        }
        // Shift right if exceeding left edge
        if (left < 15) {
            left = 15;
            adjusted = true;
        }
        // Shift up if exceeding bottom edge
        if (top + rect.height > innerHeight) {
            top = innerHeight - rect.height - 15;
            adjusted = true;
        }

        if (adjusted) {
            setMenuPos({ top, left });
        }
    }
  }, [activeMenuId, menuPos]);

  const closeMenus = () => {
    setActiveMenuId(null);
    setMenuPos(null);
  };

  return (
    <div className="flex-1 overflow-hidden" onClick={closeMenus} style={{ padding: '0 30px', display: 'grid', gridTemplateRows: '1fr 3fr', height: '100%' }}>
      
      {/* 1. TOP SECTION (ID & CONNECTION) - EXACTLY 1/4 (1fr) */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '20px', minHeight: 0 }}>
          <div className="rd-conn-section" style={{ maxWidth: '600px', margin: '0', padding: '15px 20px' }}>
            <div className="rd-conn-title" style={{ marginBottom: '12px', fontSize: '14px' }}>
                控制远程桌面 <HelpCircle size={14} style={{ opacity: 0.3, cursor: 'help' }} />
            </div>
            <div className="rd-conn-input-wrapper" style={{ marginBottom: '15px' }}>
              <input 
                type="text" 
                className="rd-conn-input"
                placeholder="请输入对方 ID"
                value={remoteId}
                onChange={(e) => setRemoteId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConnect(null)}
                style={{ height: '42px', fontSize: '18px' }}
              />
            </div>
            <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                <button 
                    className="rs-btn-blue" 
                    style={{ borderRadius: '4px 0 0 4px', height: '36px', padding: '0 22px', fontSize: '13px' }}
                    onClick={() => onConnect(null)}
                >
                    连接
                </button>
                <div style={{ position: 'relative' }}>
                    <button 
                        className="rs-btn-blue" 
                        style={{ width: '34px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 4px 4px 0', borderLeft: '1px solid rgba(255,255,255,0.2)' }} 
                        onClick={(e) => toggleMenu('connect-menu', e)}
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>
          </div>
      </div>

      {/* 2. BOTTOM SECTION - EXACTLY 3/4 (3fr) */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* NAVIGATION TAB BAR */}
          <div className="rd-icon-tab-group" style={{ paddingBottom: '6px', gap: '20px', borderBottom: '1px solid var(--rd-border)' }}>
              <div className={`rd-icon-tab ${activeSubTab === 'recent' ? 'active' : ''}`} title="近期会话" onClick={() => setActiveSubTab('recent')} style={{ height: '30px', fontSize: '14px' }}>
                <div className="flex-row" style={{ gap: '6px' }}><History size={16} /> <span>近期会话</span></div>
              </div>
              <div className={`rd-icon-tab ${activeSubTab === 'favorite' ? 'active' : ''}`} title="我的收藏" onClick={() => setActiveSubTab('favorite')} style={{ height: '30px' }}>
                <Star size={16} />
              </div>
              <div className={`rd-icon-tab ${activeSubTab === 'discover' ? 'active' : ''}`} title="发现新设备" onClick={() => setActiveSubTab('discover')} style={{ height: '30px' }}>
                <Compass size={16} />
              </div>
              <div className={`rd-icon-tab ${activeSubTab === 'address' ? 'active' : ''}`} title="地址簿" onClick={() => setActiveSubTab('address')} style={{ height: '30px' }}>
                <User size={16} />
              </div>
              <div className={`rd-icon-tab ${activeSubTab === 'devices' ? 'active' : ''}`} title="显示器" onClick={() => setActiveSubTab('devices')} style={{ height: '30px' }}>
                <Monitor size={16} />
              </div>
              
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span className="rs-icon-btn" title="搜索工具"><Search size={18} /></span>
                  <span className="rs-icon-btn" title="批量管理"><CheckSquare size={18} /></span>
                  <span className="rs-icon-btn" title="布局与排序" onClick={(e) => toggleMenu('view-menu', e)}><Menu size={18} /></span>
              </div>
          </div>

          {/* PEER LISTING AREA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 pr-1">
             <div className="rd-peer-grid" style={{ paddingTop: '10px' }}>
                {recentPeers.length > 0 ? recentPeers.map((peer: any) => (
                  <div 
                    key={peer.id} 
                    className="rd-peer-card"
                    onClick={() => onConnect(peer.id)}
                  >
                     <div className="rd-peer-icon">
                        <Monitor size={22} strokeWidth={1.5} />
                     </div>
                     <div className="rd-peer-info">
                        <div className="rd-peer-id">
                            <span><span className="rd-status-dot online"></span>{peer.id}</span>
                            <span 
                              className="rd-id-menu-btn"
                              title="管理设备"
                              onClick={(e) => toggleMenu(`peer-menu-${peer.id}`, e)}
                            >
                              <MoreVertical size={14} />
                            </span>
                        </div>
                        <div className="rd-peer-alias">Windows Desktop</div>
                     </div>
                  </div>
                )) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--rd-text-secondary)', fontSize: '13px', opacity: 0.5 }}>
                    暂无近期会话记录
                  </div>
                )}
             </div>
          </div>

          {/* FOOTER STATUS BAR */}
          <div style={{ padding: '15px 0', borderTop: '1px solid var(--rd-border)', fontSize: '11px', color: 'var(--rd-text-secondary)' }}>
              <span className="rd-status-dot online"></span> 就绪, 如果需要更快连接速度, 可选择<span className="rd-action-link" style={{ display: 'inline', marginLeft: '6px' }}>自建服务器</span>
          </div>
      </div>

      {/* 5. PORTAL DROPDOWNS (FULL FEATURE RESTORE) */}
      {activeMenuId === 'connect-menu' && menuPos && createPortal(
        <div ref={menuRef} className="rd-dropdown rs-portal-dropdown show" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}>
            <div className="rd-menu-item" onClick={() => onConnect(null)}>传输文件</div>
            <div className="rd-menu-item">查看摄像头</div>
            <div className="rd-menu-item">终端 (beta)</div>
        </div>,
        document.body
      )}

      {activeMenuId === 'view-menu' && menuPos && createPortal(
        <div ref={menuRef} className="rd-dropdown rs-portal-dropdown show" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left - 50, minWidth: '140px' }}>
            <div className="rd-menu-header">显示选项</div>
            <div className="rd-menu-item">图标显示<div className="m-dot"></div></div>
            <div className="rd-menu-item">磁贴视图<div className="m-dot active"></div></div>
            <div className="rd-menu-item">详细列表<div className="m-dot"></div></div>
        </div>,
        document.body
      )}

      {activeMenuId?.startsWith('peer-menu-') && menuPos && createPortal(
        <div ref={menuRef} className="rd-dropdown rs-portal-dropdown show" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, minWidth: '220px' }}>
            <div className="rd-menu-item">连接<div style={{ opacity: 0.4 }}><Monitor size={14}/></div></div>
            <div className="rd-menu-item">传输文件<div style={{ opacity: 0.4 }}><FileText size={14}/></div></div>
            <div className="rd-menu-item">查看摄像头<div style={{ opacity: 0.4 }}><Camera size={14}/></div></div>
            <div className="rd-menu-item">终端 (beta)<div style={{ opacity: 0.4 }}><Terminal size={14}/></div></div>
            <div className="rd-menu-item">终端 (以管理员身份运行) (beta)</div>
            <div className="rd-menu-item">TCP 隧道<div style={{ opacity: 0.4 }}><Cpu size={14}/></div></div>
            
            <div className="rd-menu-divider" />
            
            <div className="rd-menu-item" onClick={(e) => { e.stopPropagation(); setIsRelayForced(!isRelayForced); }}>
              强制走中继连接
              <div className={`rs-checkbox m-0`} style={{ pointerEvents: 'none' }}>
                <input type="checkbox" checked={isRelayForced} readOnly />
                <div className="box"></div>
              </div>
            </div>
            <div className="rd-menu-item">RDP<div style={{ opacity: 0.6 }}><Pencil size={14}/></div></div>
            <div className="rd-menu-item">创建桌面快捷方式</div>
            
            <div className="rd-menu-divider" />
            
            <div className="rd-menu-item">重命名</div>
            <div className="rd-menu-item">忘记密码<div style={{ opacity: 0.4 }}><Key size={14}/></div></div>
            <div className="rd-menu-item">从收藏中删除<div style={{ color: 'var(--rd-accent)' }}><Star size={14} fill="currentColor"/></div></div>
            
            <div className="rd-menu-divider" />
            
            <div className="rd-menu-item danger">删除<Trash2 size={14} /></div>
        </div>,
        document.body
      )}
    </div>
  );
}
