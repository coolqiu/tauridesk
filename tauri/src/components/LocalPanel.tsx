import { useState } from 'react';
import { Copy, RotateCcw, ShieldCheck, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServerStore } from '../store/serverStore';

interface LocalPanelProps {
  onOpenSettings?: (tab: string) => void;
}

export default function LocalPanel({ onOpenSettings }: LocalPanelProps) {
  const { t } = useTranslation();
  const { id, password, refreshPassword } = useServerStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsMenuOpen(false);
  };

  return (
    <aside className="rd-local-panel h-full flex-col" style={{ padding: '30px' }}>
      <h2 className="rd-panel-title">{t('This Device')}</h2>
      <p className="rd-panel-desc">
        {t('This device can be accessed remotely via the ID and one-time password below.')}
      </p>

      <div className="rd-id-box flex-col" style={{ marginTop: '20px' }}>
        <div className="rd-panel-desc" style={{ marginBottom: '8px', color: 'var(--rd-text-primary)', fontWeight: 600 }}>{t('ID')}</div>
        <div className="flex-row items-center justify-between">
            <div className="rd-id-value" style={{ fontSize: '24px', letterSpacing: '1px' }}>
              {id || '467 087 702'}
            </div>
            <div className="flex-row gap-2">
                <span className="rs-icon-btn" title={t('Copy ID')} onClick={() => copyToClipboard(id || '')}>
                  <Copy size={18} />
                </span>
                <div style={{ position: 'relative' }}>
                    <span
                      className="rd-id-menu-btn"
                      title={t('More Options')}
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        ⋮
                    </span>
                    <div className={`rd-dropdown ${isMenuOpen ? 'show' : ''}`} style={{ left: '0', top: '30px' }}>
                        <div className="rd-menu-item" onClick={() => copyToClipboard(id || '')}>{t('Copy ID')}</div>
                        <div className="rd-menu-item" onClick={() => { setIsMenuOpen(false); onOpenSettings?.('security'); }}>{t('Set Permanent Password')}</div>
                        <div className="rd-menu-divider" />
                        <div className="rd-menu-item" onClick={() => { setIsMenuOpen(false); onOpenSettings?.('security'); }}>{t('Security Settings')}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="rd-id-box flex-col" style={{ marginTop: '20px' }}>
        <div className="rd-panel-desc" style={{ marginBottom: '8px', color: 'var(--rd-text-primary)', fontWeight: 600 }}>{t('One-time Password')}</div>
        <div className="flex-row items-center justify-between">
            <div className="rd-id-value" style={{ fontSize: '24px', letterSpacing: '2px' }}>
              {password || 'fk6qts'}
            </div>
            <div className="flex-row gap-3">
                <span className="rs-icon-btn" title={t('Refresh Password')} onClick={refreshPassword}>
                  <RotateCcw size={18} />
                </span>
                <span className="rs-icon-btn" title={t('Copy Password')} onClick={() => copyToClipboard(password || '')}>
                  <Copy size={18} />
                </span>
            </div>
        </div>
      </div>

      <div className="flex-col" style={{ marginTop: 'auto', borderTop: '1px solid var(--rd-border)', paddingTop: '20px', gap: '12px' }}>
        <div className="rd-action-link flex-row gap-2" title={t('Configure access password')} onClick={() => onOpenSettings?.('security')}><Settings size={14} /> {t('Permanent Password')}</div>
        <div className="rd-action-link flex-row gap-2" title={t('Enable two-factor authentication')} onClick={() => onOpenSettings?.('security')}><ShieldCheck size={14} /> {t('Two-factor Auth')}</div>
        <div className="rd-action-link flex-row gap-1" style={{ opacity: 0.6 }}><User size={14} /> {t('Not Logged In')}</div>
      </div>

      <div className="flex-row items-center pt-4" style={{ gap: '8px', fontSize: '12px', color: 'var(--rd-text-secondary)', borderTop: '1px solid var(--rd-border)', marginTop: '20px' }}>
        <span className="rd-status-dot online"></span> {t('Network Status')}: {t('Ready')}
      </div>
    </aside>
  );
}
