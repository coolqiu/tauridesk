import { useState } from 'react';
import { useServerStore } from '../../../store/serverStore';

export default function SecurityTab() {
  const { options, setOption, setPermanentPassword, permanent_password_set } = useServerStore();
  const [isLocked, setIsLocked] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingVerificationMethod, setPendingVerificationMethod] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleCheckbox = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    setOption(name, e.target.checked ? 'Y' : 'N');
  };

  const handleRadio = (name: string, value: string) => {
    if (isLocked) return;
    if (
      name === 'verification-method' &&
      value !== 'use-temporary-password' &&
      !permanent_password_set
    ) {
      setPendingVerificationMethod(value);
      setShowPasswordModal(true);
      return;
    }
    setOption(name, value);
  };

  const passMode = options['verification-method'] || 'use-temporary-password';
  const approveMode = options['approve-mode'] || '';

  const openPasswordModal = () => {
    if (isLocked) return;
    setPendingVerificationMethod(null);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPendingVerificationMethod(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setSavingPassword(false);
  };

  const savePassword = async () => {
    const password = newPassword.trim();
    if (password.length < 6) {
      setPasswordError('固定密码至少需要 6 位。');
      return;
    }
    if (password !== confirmPassword.trim()) {
      setPasswordError('两次输入的密码不一致。');
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await setPermanentPassword(password);
      if (pendingVerificationMethod) {
        await setOption('verification-method', pendingVerificationMethod);
      }
      closePasswordModal();
    } catch (e: any) {
      setPasswordError(e?.toString?.() || '固定密码设置失败。');
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col w-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      <button 
        onClick={() => setIsLocked(!isLocked)}
        className="rs-btn-blue w-full flex justify-center mb-5" 
        style={{ 
          boxShadow: '0 1px 3px rgba(0,113,255,0.2)',
          background: isLocked ? 'var(--rd-accent)' : '#fff',
          color: isLocked ? '#fff' : 'var(--rd-accent)',
          border: isLocked ? 'none' : '1px solid var(--rd-accent)'
        }}
      >
         {isLocked ? '🛡️ 解锁安全设置' : '🔓 锁定安全设置'}
      </button>

      {/* 1. 权限 */}
      <div className={`rs-flat-card transition-opacity duration-200 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
          <div className="card-title">权限</div>
          <div className="select-wrapper mb-4">
              <select disabled={isLocked}><option>自定义</option></select>
          </div>
          
          <div className="grid grid-cols-2">
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-keyboard'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-keyboard', e)} /> <div className="box"></div> <span>允许控制键盘/鼠标</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-tunnel'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-tunnel', e)} /> <div className="box"></div> <span>允许建立 TCP 隧道</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-remote-printer'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-remote-printer', e)} /> <div className="box"></div> <span>启用远程打印机</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-remote-restart'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-remote-restart', e)} /> <div className="box"></div> <span>允许远程重启</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-clipboard'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-clipboard', e)} /> <div className="box"></div> <span>允许同步剪贴板</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-record-session'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-record-session', e)} /> <div className="box"></div> <span>允许录制会话</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-file-transfer'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-file-transfer', e)} /> <div className="box"></div> <span>允许传输文件</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-block-input'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-block-input', e)} /> <div className="box"></div> <span>允许阻止用户输入</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-audio'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-audio', e)} /> <div className="box"></div> <span>允许传输音频</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-remote-config-modification'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-remote-config-modification', e)} /> <div className="box"></div> <span>允许远程修改配置</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-camera'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-camera', e)} /> <div className="box"></div> <span>允许查看摄像头</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['enable-terminal'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('enable-terminal', e)} /> <div className="box"></div> <span>启用终端</span></label>
          </div>
      </div>

      {/* 2. 密码 */}
      <div className="rs-flat-card">
          <div className="card-title">密码</div>
          <div style={{ fontSize: '12px', color: 'var(--rd-text-secondary)', marginBottom: '8px' }}>
            固定密码：{permanent_password_set ? '已设置' : '未设置'}
          </div>
          <div className="flex flex-col">
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'use-temporary-password'} onChange={() => handleRadio('verification-method', 'use-temporary-password')} /> 
                  <div className="dot"></div> <span>使用一次性密码</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'use-permanent-password'} onChange={() => handleRadio('verification-method', 'use-permanent-password')} /> 
                  <div className="dot"></div> <span>使用固定密码</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'use-both-passwords'} onChange={() => handleRadio('verification-method', 'use-both-passwords')} /> 
                  <div className="dot"></div> <span>同时使用两种密码</span>
              </label>
          </div>
          <button
            className="rs-btn-blue"
            disabled={isLocked}
            onClick={openPasswordModal}
            style={{ marginTop: '12px', padding: '8px 22px', opacity: isLocked ? 0.45 : 1 }}
          >
            设置固定密码
          </button>
      </div>

      <div className="rs-flat-card">
          <div className="card-title">连接确认</div>
          <div style={{ fontSize: '12px', color: 'var(--rd-text-secondary)', marginBottom: '8px' }}>
            控制端是否弹出密码框由这里决定。选择“仅密码”后，受控端不需要再点授权。
          </div>
          <div className="flex flex-col">
              <label className="rs-radio">
                  <input type="radio" name="approve-mode" checked={approveMode !== 'password' && approveMode !== 'click'} disabled={isLocked} onChange={() => handleRadio('approve-mode', '')} />
                  <div className="dot"></div> <span>密码或受控端确认</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="approve-mode" checked={approveMode === 'password'} disabled={isLocked} onChange={() => handleRadio('approve-mode', 'password')} />
                  <div className="dot"></div> <span>仅密码</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="approve-mode" checked={approveMode === 'click'} disabled={isLocked} onChange={() => handleRadio('approve-mode', 'click')} />
                  <div className="dot"></div> <span>仅受控端确认</span>
              </label>
          </div>
      </div>

      {showPasswordModal && (
        <div className="rs-modal-overlay">
          <div className="rs-modal-content">
            <div className="rs-modal-header">
              <span className="rs-modal-title">设置固定密码</span>
            </div>
            <div className="flex-col">
              <div className="rs-modal-row">
                <label className="rs-modal-label">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="rs-input-gray"
                  autoFocus
                />
              </div>
              <div className="rs-modal-row">
                <label className="rs-modal-label">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="rs-input-gray"
                  onKeyDown={e => {
                    if (e.key === 'Enter') savePassword();
                    if (e.key === 'Escape') closePasswordModal();
                  }}
                />
              </div>
              {passwordError && (
                <div style={{ color: '#d14343', fontSize: '12px', marginTop: '-6px' }}>{passwordError}</div>
              )}
            </div>
            <div className="rs-modal-footer">
              <button
                onClick={closePasswordModal}
                style={{ padding: '8px 24px', borderRadius: '8px', fontSize: '14px', background: '#F2F2F2', color: '#333' }}
              >
                取消
              </button>
              <button
                onClick={savePassword}
                disabled={savingPassword}
                className="rs-btn-blue"
                style={{ borderRadius: '8px', padding: '8px 28px', opacity: savingPassword ? 0.7 : 1 }}
              >
                {savingPassword ? '保存中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
