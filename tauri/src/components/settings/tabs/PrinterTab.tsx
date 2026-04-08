export default function PrinterTab() {
  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      <div className="rs-flat-card">
          <div className="card-title">打印机</div>
          <div className="flex-col" style={{ gap: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--rd-text-primary)' }}>驱动：系统默认</div>
              <div className="flex-row">
                  <button className="rs-btn-blue" style={{ padding: '8px 24px' }}>安装驱动</button>
              </div>
          </div>
      </div>
    </div>
  );
}
