export default function PluginTab() {
  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      <div className="rs-flat-card">
          <div className="card-title">插件</div>
          <div style={{ fontSize: '14px', color: 'var(--rd-text-secondary)' }}>当前没有安装任何插件。</div>
      </div>
    </div>
  );
}
