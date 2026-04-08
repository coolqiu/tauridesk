export default function AboutTab() {
  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      {/* 1. 关于 */}
      <div className="rs-flat-card">
          <div className="card-title">关于</div>
          <div className="flex-row" style={{ alignItems: 'flex-start', gap: '40px' }}>
              <div className="m-blue" style={{ width: '60px' }}>
                  <svg style={{ width: '60px', height: '60px' }} viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M20 6 L26 24 L20 34 L14 24 Z" fill="currentColor"/>
                      <circle cx="20" cy="20" r="2" fill="white"/>
                  </svg>
              </div>
              <div className="flex-col">
                  <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--rd-text-primary)', marginBottom: '4px' }}>RustDesk</div>
                  <div style={{ fontSize: '13px', color: 'var(--rd-text-secondary)' }}>版本：1.2.3 (Tauri Built)</div>
                  <div style={{ fontSize: '12px', color: '#BBB', marginTop: '16px', lineHeight: 1.6 }}>
                      版权所有 © 2026 RustDesk 软件。<br />
                      采用 AGPL-3.0 许可协议。
                  </div>
              </div>
          </div>
          <div className="flex-row" style={{ marginTop: '25px', gap: '10px' }}>
              <button className="rs-btn-blue" style={{ background: '#F2F2F2', color: '#333', boxShadow: 'none', padding: '8px 20px' }}>官方网站</button>
              <button className="rs-btn-blue" style={{ background: '#F2F2F2', color: '#333', boxShadow: 'none', padding: '8px 20px' }}>源代码</button>
          </div>
      </div>
    </div>
  );
}
