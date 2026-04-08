import { useState } from 'react';
import { useServerStore } from '../../../store/serverStore';

export default function NetworkTab() {
  const { options, setOption } = useServerStore();
  const [activeModal, setActiveModal] = useState<null | 'id-relay' | 'proxy'>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [idServer, setIdServer] = useState(options['id-server'] || '');
  const [relayServer, setRelayServer] = useState(options['relay-server'] || '');
  const [apiServer, setApiServer] = useState(options['api-server'] || '');
  const [key, setKey] = useState(options['key'] || '');

  const [proxyServer, setProxyServer] = useState(options['proxy-server'] || '');
  const [proxyUser, setProxyUser] = useState(options['proxy-user'] || '');
  const [proxyPwd, setProxyPwd] = useState(options['proxy-pwd'] || '');

  const handleToggle = (name: string, current: string) => {
    setOption(name, current === 'Y' ? 'N' : 'Y');
  };

  const handleSaveIdRelay = () => {
    setOption('id-server', idServer);
    setOption('relay-server', relayServer);
    setOption('api-server', apiServer);
    setOption('key', key);
    setActiveModal(null);
  };

  const handleSaveProxy = () => {
    setOption('proxy-server', proxyServer);
    setOption('proxy-user', proxyUser);
    setOption('proxy-pwd', proxyPwd);
    setActiveModal(null);
  };

  const useWs = options['use-ws'] === 'Y';

  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      <div style={{ maxWidth: '540px', width: '100%', margin: '0 auto' }}>
          <button className="rs-btn-blue w-full mb-5" style={{ background: '#fff', color: 'var(--rd-accent)', border: '1px solid var(--rd-accent)', boxShadow: 'none' }}>
            🛡️ 解锁网络设置
          </button>

          {/* 1. 网络配置 */}
          <div className="rs-flat-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '20px 20px 8px 20px' }}>网络</div>
              
              <div className="flex-col">
                  {/* ID/中继服务器 */}
                  <div 
                    onClick={() => setActiveModal('id-relay')}
                    className="rs-list-item-hover flex-row"
                    style={{ padding: '16px 20px', borderBottom: '1px solid var(--rd-border)', cursor: 'pointer' }}
                  >
                      <div className="m-blue" style={{ width: '24px', marginRight: '16px', display: 'flex', justifyContent: 'center' }}>
                          <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="6" rx="1"/><rect x="2" y="13" width="20" height="6" rx="1"/><circle cx="5" cy="8" r="1"/><circle cx="5" cy="16" r="1"/></svg>
                      </div>
                      <div className="flex-1" style={{ fontSize: '15px', color: '#333' }}>ID/中继服务器</div>
                      <div style={{ color: '#BBB', fontSize: '18px' }}>❯</div>
                  </div>

                  {/* 代理设置 */}
                  <div 
                    onClick={() => setActiveModal('proxy')}
                    className="rs-list-item-hover flex-row"
                    style={{ padding: '16px 20px', borderBottom: '1px solid var(--rd-border)', cursor: 'pointer' }}
                  >
                      <div className="m-blue" style={{ width: '24px', marginRight: '16px', display: 'flex', justifyContent: 'center' }}>
                          <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 7h-9m0 0l3-3m-3 3l3 3M4 17h9m0 0l-3-3m3 3l-3 3"/></svg>
                      </div>
                      <div className="flex-1" style={{ fontSize: '15px', color: '#333' }}>Socks5/Http(s) 代理</div>
                      <div style={{ color: '#BBB', fontSize: '18px' }}>❯</div>
                  </div>

                  {/* WebSocket */}
                  <div className="flex-row" style={{ padding: '16px 20px' }}>
                      <div className="m-blue" style={{ width: '24px', marginRight: '16px', display: 'flex', justifyContent: 'center' }}>
                          <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/></svg>
                      </div>
                      <div className="flex-1" style={{ fontSize: '15px', color: '#333' }}>使用 WebSocket <span style={{ opacity: 0.3, fontSize: '12px', cursor: 'help' }}>?</span></div>
                      <label className="rs-switch">
                          <input 
                            type="checkbox" 
                            checked={useWs} 
                            onChange={() => handleToggle('use-ws', options['use-ws'] || 'N')}
                          />
                          <div className="slider"></div>
                      </label>
                  </div>
              </div>
          </div>
      </div>

      {/* ID/Relay Modal */}
      {activeModal === 'id-relay' && (
          <div className="rs-modal-overlay">
              <div className="rs-modal-content">
                  <div className="rs-modal-header">
                     <span className="rs-modal-title">ID/中继服务器</span>
                     <div className="flex-row" style={{ gap: '16px' }}>
                        <div className="rs-icon-btn">
                            <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        </div>
                        <div className="rs-icon-btn">
                            <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </div>
                     </div>
                  </div>

                  <div className="flex-col">
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">ID 服务器</label>
                          <input value={idServer} onChange={e => setIdServer(e.target.value)} className="rs-input-gray" />
                      </div>
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">中继服务器</label>
                          <input value={relayServer} onChange={e => setRelayServer(e.target.value)} className="rs-input-gray" />
                      </div>
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">API 服务器</label>
                          <input value={apiServer} onChange={e => setApiServer(e.target.value)} className="rs-input-gray" />
                      </div>
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">Key</label>
                          <input value={key} onChange={e => setKey(e.target.value)} className="rs-input-gray" />
                      </div>
                  </div>

                  <div className="rs-modal-footer">
                      <button onClick={() => setActiveModal(null)} style={{ padding: '8px 24px', borderRadius: '8px', fontSize: '14px', background: '#F2F2F2', color: '#333' }}>取消</button>
                      <button onClick={handleSaveIdRelay} className="rs-btn-blue" style={{ borderRadius: '8px', padding: '8px 28px' }}>确认</button>
                  </div>
              </div>
          </div>
      )}

      {/* Proxy Modal */}
      {activeModal === 'proxy' && (
          <div className="rs-modal-overlay">
              <div className="rs-modal-content">
                  <div className="rs-modal-header">
                      <span className="rs-modal-title">Socks5/Http(s) 代理</span>
                  </div>
                  
                  <div className="flex-col">
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">服务器 <span style={{ opacity: 0.4, fontStyle: 'italic' }}>?</span></label>
                          <input value={proxyServer} onChange={e => setProxyServer(e.target.value)} className="rs-input-gray" />
                      </div>
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">用户名</label>
                          <input value={proxyUser} onChange={e => setProxyUser(e.target.value)} className="rs-input-gray" />
                      </div>
                      <div className="rs-modal-row">
                          <label className="rs-modal-label">密码</label>
                          <div className="flex-1 flex-row" style={{ position: 'relative' }}>
                             <input 
                                type={showPassword ? "text" : "password"}
                                value={proxyPwd} 
                                onChange={e => setProxyPwd(e.target.value)} 
                                className="rs-input-gray" 
                                style={{ paddingRight: '45px' }}
                             />
                             <div 
                                onClick={() => setShowPassword(!showPassword)}
                                className="rs-icon-btn"
                                style={{ position: 'absolute', right: '12px' }}
                             >
                                <svg className="rs-icon-20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                             </div>
                          </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#BBB', marginTop: '-12px' }}>{proxyPwd.length}/128</div>
                  </div>

                  <div className="rs-modal-footer">
                      <button onClick={() => setActiveModal(null)} style={{ padding: '8px 24px', borderRadius: '8px', fontSize: '14px', background: '#F2F2F2', color: '#333' }}>取消</button>
                      <button onClick={handleSaveProxy} className="rs-btn-blue" style={{ borderRadius: '8px', padding: '8px 28px' }}>确认</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
