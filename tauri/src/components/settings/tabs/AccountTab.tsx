export default function AccountTab() {
  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      <div className="rs-flat-card">
          <div className="card-title">账户</div>
          <div style={{ fontSize: '14px', color: 'var(--rd-text-secondary)', marginBottom: '20px' }}>您尚未登录 RustDesk 账户。</div>
          <button className="rs-btn-blue" style={{ padding: '10px 32px' }}>登录</button>
      </div>
    </div>
  );
}
