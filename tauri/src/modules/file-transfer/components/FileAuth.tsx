// components/FileAuth.tsx
import { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';

interface FileAuthProps {
  peerId: string;
  onAuth: (password: string) => Promise<void>;
}

export default function FileAuth({ peerId, onAuth }: FileAuthProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError(null);
    try {
      await onAuth(password);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#F9FAFB', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '320px', background: '#fff', padding: '32px',
        borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '12px', background: '#EEF2FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Lock size={28} style={{ color: '#4F46E5' }} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          需要身份验证
        </h2>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
          请输入远程设备 <b>{peerId}</b> 的访问密码
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="访问密码"
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '16px', textAlign: 'left' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', background: '#4F46E5',
              color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
              cursor: (loading || !password) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.2s',
              opacity: (loading || !password) ? 0.7 : 1,
            }}
          >
            {loading ? (
              <div style={{
                width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <>
                验证并连接 <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} style={{ color: '#10B981' }} />
          <span style={{ fontSize: '11px', color: '#6B7280' }}>端到端加密安全连接</span>
        </div>
      </div>
    </div>
  );
}
