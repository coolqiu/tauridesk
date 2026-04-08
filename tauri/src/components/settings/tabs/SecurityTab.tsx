import { useState } from 'react';
import { useServerStore } from '../../../store/serverStore';

export default function SecurityTab() {
  const { options, setOption } = useServerStore();
  const [isLocked, setIsLocked] = useState(true);

  const handleCheckbox = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    setOption(name, e.target.checked ? 'Y' : 'N');
  };

  const handleRadio = (name: string, value: string) => {
    if (isLocked) return;
    setOption(name, value);
  };

  const passMode = options['password-mode'] || 'otp';

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
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-km'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-km', e)} /> <div className="box"></div> <span>允许控制键盘/鼠标</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-tunnel'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-tunnel', e)} /> <div className="box"></div> <span>允许建立 TCP 隧道</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-print'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-print', e)} /> <div className="box"></div> <span>启用远程打印机</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-reboot'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-reboot', e)} /> <div className="box"></div> <span>允许远程重启</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-clipboard'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-clipboard', e)} /> <div className="box"></div> <span>允许同步剪贴板</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-record'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-record', e)} /> <div className="box"></div> <span>允许录制会话</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-file'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-file', e)} /> <div className="box"></div> <span>允许传输文件</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-block-input'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-block-input', e)} /> <div className="box"></div> <span>允许阻止用户输入</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-audio'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-audio', e)} /> <div className="box"></div> <span>允许传输音频</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-config'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-config', e)} /> <div className="box"></div> <span>允许远程修改配置</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-camera'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-camera', e)} /> <div className="box"></div> <span>允许查看摄像头</span></label>
              <label className="rs-checkbox"><input type="checkbox" checked={options['allow-terminal'] !== 'N'} disabled={isLocked} onChange={(e) => handleCheckbox('allow-terminal', e)} /> <div className="box"></div> <span>启用终端</span></label>
          </div>
      </div>

      {/* 2. 密码 */}
      <div className="rs-flat-card">
          <div className="card-title">密码</div>
          <div className="flex flex-col">
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'otp'} onChange={() => handleRadio('password-mode', 'otp')} /> 
                  <div className="dot"></div> <span>使用一次性密码</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'fixed'} onChange={() => handleRadio('password-mode', 'fixed')} /> 
                  <div className="dot"></div> <span>使用固定密码</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="pass-mode" checked={passMode === 'both'} onChange={() => handleRadio('password-mode', 'both')} /> 
                  <div className="dot"></div> <span>同时使用两种密码</span>
              </label>
          </div>
      </div>
    </div>
  );
}
