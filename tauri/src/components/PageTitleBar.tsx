import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const appWindow = (() => {
  try { return getCurrentWindow(); } catch { return null; }
})();

interface PageTitleBarProps {
  title: string;
}

export default function PageTitleBar({ title }: PageTitleBarProps) {
  const { t } = useTranslation();

  return (
    <nav className="rd-titlebar">
      <div className="flex-row h-full items-center">
         <div className="m-blue" style={{ margin: '0 15px', display: 'flex' }}>
            <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 10 L20 30 M10 20 L30 20" stroke="currentColor" strokeWidth="3"/>
            </svg>
         </div>
         <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--rd-text-primary)' }}>{title}</span>
      </div>

      <div className="rd-window-controls">
         <button onClick={() => appWindow?.minimize()} className="rd-window-control" title={t('Minimize')}>
            <Minus size={16} />
         </button>
         <button onClick={() => appWindow?.toggleMaximize()} className="rd-window-control" title={t('Maximize')}>
            <Square size={13} />
         </button>
         <button onClick={() => appWindow?.close()} className="rd-window-control" style={{ color: '#D93025' }} title={t('Close')}>
            <X size={18} />
         </button>
      </div>
    </nav>
  );
}
