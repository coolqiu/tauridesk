import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  Home, Settings, HelpCircle, User, 
  Menu, Minus, Square, X 
} from 'lucide-react';

// Safe window helper
const getAppWindow = () => {
  try {
    return getCurrentWindow();
  } catch (e) {
    return null;
  }
};

const appWindow = getAppWindow();

interface TitleBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TitleBar({ activeTab, onTabChange }: TitleBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="rd-titlebar">
      <div className="flex-row h-full items-center">
         {/* Logo Section */}
         <div className="m-blue" style={{ margin: '0 15px', display: 'flex' }}>
            <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M20 6 L26 24 L20 34 L14 24 Z" fill="currentColor"/>
              <circle cx="20" cy="20" r="2" fill="white"/>
            </svg>
         </div>

         <div className="rd-titlebar-tabs">
            <button 
              onClick={() => onTabChange('home')}
              className={`rd-titlebar-tab ${activeTab === 'home' ? 'active' : ''}`}
            >
               <Home size={16} style={{ marginRight: '8px' }} />
               <span>主页</span>
            </button>
            <button 
              onClick={() => onTabChange('settings')}
              className={`rd-titlebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
            >
               <Settings size={16} style={{ marginRight: '8px' }} />
               <span>设置</span>
            </button>
         </div>
      </div>

      <div className="rd-window-controls">
         <div className="flex-row pr-[10px]">
            <div className="rd-window-control" title="帮助"><HelpCircle size={18} /></div>
            <div className="rd-window-control" title="账户"><User size={18} /></div>
            <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`rd-window-control ${isMenuOpen ? 'bg-black/5' : 'opacity-40 hover:opacity-100'}`}
                  title="菜单"
                >
                   <Menu size={18} />
                </button>
                
                {isMenuOpen && (
                  <div className={`rd-dropdown show`} style={{ top: '100%', right: 0, width: '180px' }}>
                     <div className="rd-menu-item" onClick={() => { setIsMenuOpen(false); }}>
                        <span>关于 RustDesk</span>
                     </div>
                     <div className="rd-menu-item" onClick={() => { setIsMenuOpen(false); }}>
                        <span>检查更新</span>
                     </div>
                     <div className="rd-menu-divider" />
                     <div className="rd-menu-item" onClick={() => { window.open('https://rustdesk.com', '_blank'); setIsMenuOpen(false); }}>
                        <span>访问官网</span>
                     </div>
                     <div className="rd-menu-item danger" onClick={() => appWindow?.close()}>
                        <span>退出</span>
                     </div>
                  </div>
                )}
            </div>
         </div>

         <div style={{ width: '1px', height: '20px', background: 'var(--rd-border)', margin: '0 10px', alignSelf: 'center' }}></div>

         <button 
           onClick={() => appWindow?.minimize()}
           className="rd-window-control"
           title="最小化"
         >
            <Minus size={16} />
         </button>
         <button 
           onClick={() => appWindow?.toggleMaximize()}
           className="rd-window-control"
           title="最大化"
         >
            <Square size={13} />
         </button>
         <button 
           onClick={() => appWindow?.close()}
           className="rd-window-control"
           style={{ color: '#D93025' }}
           title="关闭"
         >
            <X size={18} />
         </button>
      </div>
    </nav>
  );
}
