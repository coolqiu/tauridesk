// components/PasswordModal.tsx
import { useState } from 'react';
import { X, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface PasswordModalProps {
  id: string;
  onConfirm: (password: string) => Promise<void>;
  onClose: () => void;
}

export default function PasswordModal({ id, onConfirm, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err: any) {
      setError(err.toString());
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        width: '360px', background: '#fff', borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        padding: '24px', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF'
        }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', background: '#EEF2FF', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#4F46E5'
          }}>
            <Lock size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
            身份验证
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            请输入远程设备 <span style={{ fontWeight: 600, color: '#4F46E5' }}>{id}</span> 的访问密码
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              autoFocus
              type="password"
              placeholder="访问密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                border: error ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                fontSize: '14px', outline: 'none', transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
            />
            {error && (
              <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px' }}>{error}</p>
            )}
          </div>

          <button
            disabled={loading || !password}
            type="submit"
            style={{
              width: '100%', height: '44px', background: '#4F46E5', color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: (loading || !password) ? 'not-allowed' : 'pointer',
              opacity: (loading || !password) ? 0.7 : 1, transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>验证并连接 <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
