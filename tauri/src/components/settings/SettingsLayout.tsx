import { type ReactNode, useState } from 'react';

interface SettingsLayoutProps {
  children: (activeTab: string) => ReactNode;
}

const SETTINGS_ICONS = {
  general: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15c.32.8.56 1.65.69 2.53l.11 1a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2l.11-1c.13-.88.37-1.73.69-2.53"/>
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  display: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    </svg>
  ),
  plugin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 2v4M14 2v4M3 10h4M3 14h4M21 10h-4M21 14h-4M10 18v4M14 18v4"/>
    </svg>
  ),
  printer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  const navItems = [
    { id: 'general', label: '常规' },
    { id: 'security', label: '安全' },
    { id: 'network', label: '网络' },
    { id: 'display', label: '显示' },
    { id: 'account', label: '账户' },
    { id: 'plugin', label: '插件' },
    { id: 'printer', label: '打印机' },
    { id: 'about', label: '关于' },
  ];

  return (
    <div className="flex flex-1 h-full w-full min-h-0 overflow-hidden">
      {/* 1. INDUSTRIAL SIDEBAR (220px SYNC) */}
      <aside 
        className="bg-[var(--rd-bg-sidebar)] border-right border-[var(--rd-border)] flex flex-col pt-[15px] flex-shrink-0"
        style={{ width: 'var(--rd-settings-sidebar-w)', height: '100%' }}
      >
        <div style={{ padding: '10px 24px', fontSize: '18px', color: 'var(--rd-accent)', fontWeight: '600', marginBottom: '15px' }}>
           设置
        </div>
        
        <nav className="flex flex-col flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
               key={item.id}
               onClick={() => setActiveSettingsTab(item.id)}
               className={`rs-nav-item ${activeSettingsTab === item.id ? 'active' : ''}`}
            >
               {SETTINGS_ICONS[item.id as keyof typeof SETTINGS_ICONS]}
               <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. INDUSTRIAL CONTENT (SCROLLABLE) */}
      <main className="flex-1 bg-[var(--rd-bg-scaffold)] overflow-y-auto custom-scrollbar flex flex-col" style={{ height: 'calc(100vh - var(--rd-titlebar-h))' }}>
        <div className="flex flex-col w-full flex-shrink-0">
           {children(activeSettingsTab)}
        </div>
      </main>
    </div>
  );
}
