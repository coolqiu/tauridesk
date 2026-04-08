import { useState } from 'react';
import { Copy, RotateCcw, ShieldCheck, Settings, User } from 'lucide-react';
import { useServerStore } from '../store/serverStore';

export default function LocalPanel() {
  const { id, password, refreshPassword } = useServerStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsMenuOpen(false);
  };

  return (
    <aside className="rd-local-panel h-full flex-col" style={{ padding: '30px' }}>
      <h2 className="rd-panel-title">这台设备</h2>
      <p className="rd-panel-desc">
        可以通过下面的 ID 和一性密码远程访问此设备。
      </p>
      
      <div className="rd-id-box flex-col" style={{ marginTop: '20px' }}>
        <div className="rd-panel-desc" style={{ marginBottom: '8px', color: 'var(--rd-text-primary)', fontWeight: 600 }}>ID</div>
        <div className="flex-row items-center justify-between">
            <div className="rd-id-value" style={{ fontSize: '24px', letterSpacing: '1px' }}>
              {id || '467 087 702'}
            </div>
            <div className="flex-row gap-2">
                <span className="rs-icon-btn" title="复制 ID" onClick={() => copyToClipboard(id || '')}>
                  <Copy size={18} />
                </span>
                <div style={{ position: 'relative' }}>
                    <span 
                      className="rd-id-menu-btn" 
                      title="更多选项"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        ⋮
                    </span>
                    <div className={`rd-dropdown ${isMenuOpen ? 'show' : ''}`} style={{ left: '0', top: '30px' }}>
                        <div className="rd-menu-item" onClick={() => copyToClipboard(id || '')}>复制 ID</div>
                        <div className="rd-menu-item">设置固定密码</div>
                        <div className="rd-menu-divider" />
                        <div className="rd-menu-item">安全设置</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="rd-id-box flex-col" style={{ marginTop: '20px' }}>
        <div className="rd-panel-desc" style={{ marginBottom: '8px', color: 'var(--rd-text-primary)', fontWeight: 600 }}>验证码</div>
        <div className="flex-row items-center justify-between">
            <div className="rd-id-value" style={{ fontSize: '24px', letterSpacing: '2px' }}>
              {password || 'fk6qts'}
            </div>
            <div className="flex-row gap-3">
                <span className="rs-icon-btn" title="刷新验证码" onClick={refreshPassword}>
                  <RotateCcw size={18} />
                </span>
                <span className="rs-icon-btn" title="复制验证码" onClick={() => copyToClipboard(password || '')}>
                  <Copy size={18} />
                </span>
            </div>
        </div>
      </div>

      <div className="flex-col" style={{ marginTop: 'auto', borderTop: '1px solid var(--rd-border)', paddingTop: '20px', gap: '12px' }}>
        <div className="rd-action-link flex-row gap-2" title="配置访问密码"><Settings size={14} /> 固定密码设置</div>
        <div className="rd-action-link flex-row gap-2" title="开启双重验证防护"><ShieldCheck size={14} /> 二步验证保护</div>
        <div className="rd-action-link flex-row gap-1" style={{ opacity: 0.6 }}><User size={14} /> 未登录</div>
      </div>

      <div className="flex-row items-center pt-4" style={{ gap: '8px', fontSize: '12px', color: 'var(--rd-text-secondary)', borderTop: '1px solid var(--rd-border)', marginTop: '20px' }}>
        <span className="rd-status-dot online"></span> 网络状态：就绪
      </div>
    </aside>
  );
}
