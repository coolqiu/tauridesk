import { useServerStore } from '../../../store/serverStore';

const LANGUAGES = [
  { label: '默认', value: 'default' },
  { label: 'العربية (ar)', value: 'ar' },
  { label: 'Беларуская (be)', value: 'be' },
  { label: 'Български (bg)', value: 'bg' },
  { label: 'Català (ca)', value: 'ca' },
  { label: 'Čeština (cs)', value: 'cs' },
  { label: 'Dansk (da)', value: 'da' },
  { label: 'Deutsch (de)', value: 'de' },
  { label: 'Ελληνικά (el)', value: 'el' },
  { label: 'English (en)', value: 'en' },
  { label: 'Esperanto (eo)', value: 'eo' },
  { label: 'Español (es)', value: 'es' },
  { label: 'Eesti keel (et)', value: 'et' },
  { label: 'Euskara (eu)', value: 'eu' },
  { label: 'فارسی (fa)', value: 'fa' },
  { label: 'Suomi (fi)', value: 'fi' },
  { label: 'Français (fr)', value: 'fr' },
  { label: 'ქართული (ge)', value: 'ge' },
  { label: 'עברית (he)', value: 'he' },
  { label: 'Hrvatski (hr)', value: 'hr' },
  { label: 'Magyar (hu)', value: 'hu' },
  { label: 'Indonesia (id)', value: 'id' },
  { label: 'Italiano (it)', value: 'it' },
  { label: '日本語 (ja)', value: 'ja' },
  { label: '한국어 (ko)', value: 'ko' },
  { label: 'Қазақ (kz)', value: 'kz' },
  { label: 'Lietuvių (lt)', value: 'lt' },
  { label: 'Latviešu (lv)', value: 'lv' },
  { label: 'Norsk bokmål (nb)', value: 'nb' },
  { label: 'Nederlands (nl)', value: 'nl' },
  { label: 'Polski (pl)', value: 'pl' },
  { label: 'Português (pt)', value: 'pt' },
  { label: 'Română (ro)', value: 'ro' },
  { label: 'Русский (ru)', value: 'ru' },
  { label: 'Sardu (sc)', value: 'sc' },
  { label: 'Slovenščina (sk)', value: 'sk' },
  { label: 'Slovenščina (sl)', value: 'sl' },
  { label: 'Shqip (sq)', value: 'sq' },
  { label: 'Srpski (sr)', value: 'sr' },
  { label: 'Svenska (sv)', value: 'sv' },
  { label: 'தமிழ் (ta)', value: 'ta' },
  { label: 'ภาษาไทย (th)', value: 'th' },
  { label: 'Türkçe (tr)', value: 'tr' },
  { label: 'Українська (uk)', value: 'uk' },
  { label: 'Tiếng Việt (vi)', value: 'vi' },
  { label: '简体中文 (zh-cn)', value: 'zh-cn' },
  { label: '繁體中文 (zh-tw)', value: 'zh-tw' }
];

export default function GeneralTab() {
  const { options, localOptions, setOption, setLocalOption, id } = useServerStore();

  const handleCheckbox = (name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setOption(name, e.target.checked ? 'Y' : 'N');
  };

  const currentTheme = localOptions['theme'] || 'system';
  const currentLang = localOptions['lang'] || 'default';

  return (
    <div className="flex flex-col w-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      {/* 1. 服务 */}
      <div className="rs-flat-card">
          <div className="card-title">服务</div>
          {id && (
            <div style={{ fontSize: '13px', color: 'var(--rd-text-secondary)', marginBottom: '15px' }}>
               服务正在运行 (ID: {id})
            </div>
          )}
          <button 
            className="rs-btn-blue" 
            style={{ padding: '10px 28px' }}
            onClick={() => alert('Stopping service...')}
          >停止</button>
      </div>

      {/* 2. 主题 */}
      <div className="rs-flat-card">
          <div className="card-title">主题</div>
          <div className="flex flex-col">
              <label className="rs-radio">
                  <input type="radio" name="theme" checked={currentTheme === 'light'} onChange={() => setLocalOption('theme', 'light')} /> 
                  <div className="dot"></div> <span>明亮</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="theme" checked={currentTheme === 'dark'} onChange={() => setLocalOption('theme', 'dark')} /> 
                  <div className="dot"></div> <span>黑暗</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="theme" checked={currentTheme === 'system'} onChange={() => setLocalOption('theme', 'system')} /> 
                  <div className="dot"></div> <span>跟随系统</span>
              </label>
          </div>
      </div>

      {/* 3. 语言 */}
      <div className="rs-flat-card">
          <div className="card-title">语言</div>
          <div className="select-wrapper">
              <select value={currentLang} onChange={(e) => setLocalOption('lang', e.target.value)}>
                  {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
              </select>
          </div>
      </div>

      {/* 4. 硬件编解码 */}
      <div className="rs-flat-card">
          <div className="card-title">硬件编解码</div>
          <label className="rs-checkbox">
              <input type="checkbox" checked={options['enable-hwcodec'] === 'Y'} onChange={(e) => handleCheckbox('enable-hwcodec', e)} /> 
              <div className="box"></div> <span>启用硬件编解码</span>
          </label>
      </div>

      {/* 5. 音频输入设备 */}
      <div className="rs-flat-card">
          <div className="card-title">音频输入设备</div>
          <div className="select-wrapper">
              <select>
                  <option>系统音频</option>
              </select>
          </div>
      </div>

      {/* 6. 录屏 */}
      <div className="rs-flat-card">
          <div className="card-title">录屏</div>
          <label className="rs-checkbox">
              <input type="checkbox" checked={options['allow-auto-record-incoming'] === 'Y'} onChange={(e) => handleCheckbox('allow-auto-record-incoming', e)} /> 
              <div className="box"></div> <span>自动录制传入会话</span>
          </label>
          <label className="rs-checkbox">
              <input type="checkbox" checked={options['allow-auto-record-outgoing'] === 'Y'} onChange={(e) => handleCheckbox('allow-auto-record-outgoing', e)} /> 
              <div className="box"></div> <span>自动录制传出会话</span>
          </label>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>被控：C:\ProgramData\RustDesk\recording</div>
          <div className="flex flex-row" style={{ justifyContent: 'space-between', marginTop: '6px' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>主控：<span className="path-link">C:\Users\qyf\Videos\RustDesk</span></div>
              <button className="rs-btn-blue" style={{ padding: '4px 16px', fontSize: '12px' }}>更改</button>
          </div>
      </div>

      <div className="rs-flat-card" style={{ marginBottom: '40px' }}>
          <div className="card-title">其他</div>
          <div className="flex flex-col">
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-confirm-closing-tabs'] === 'Y'} onChange={(e) => handleCheckbox('enable-confirm-closing-tabs', e)} /> 
                <div className="box"></div> <span>关闭多个标签页时向您确认</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-abr'] === 'Y'} onChange={(e) => handleCheckbox('enable-abr', e)} /> 
                <div className="box"></div> <span>自适应码率</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['allow-remove-wallpaper'] === 'Y'} onChange={(e) => handleCheckbox('allow-remove-wallpaper', e)} /> 
                <div className="box"></div> <span>接受会话时移除桌面壁纸</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-open-new-connections-in-tabs'] === 'Y'} onChange={(e) => handleCheckbox('enable-open-new-connections-in-tabs', e)} /> 
                <div className="box"></div> <span>在选项卡中打开新连接</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['use-texture-render'] === 'Y'} onChange={(e) => handleCheckbox('use-texture-render', e)} /> 
                <div className="box"></div> <span>使用纹理渲染</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['allow-d3d-render'] === 'Y'} onChange={(e) => handleCheckbox('allow-d3d-render', e)} /> 
                <div className="box"></div> <span>使用 D3D 渲染</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-check-update'] === 'Y'} onChange={(e) => handleCheckbox('enable-check-update', e)} /> 
                <div className="box"></div> <span>启动时检查软件更新</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['allow-auto-update'] === 'Y'} onChange={(e) => handleCheckbox('allow-auto-update', e)} /> 
                <div className="box"></div> <span>自动更新</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['use-directx-capture'] === 'Y'} onChange={(e) => handleCheckbox('use-directx-capture', e)} /> 
                <div className="box"></div> <span>使用 DirectX 捕获屏幕</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-udp-punch'] === 'Y'} onChange={(e) => handleCheckbox('enable-udp-punch', e)} /> 
                <div className="box"></div> <span>启用 UDP 打洞</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['enable-ipv6-punch'] === 'Y'} onChange={(e) => handleCheckbox('enable-ipv6-punch', e)} /> 
                <div className="box"></div> <span>启用 IPv6 P2P 连接</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['keep-awake-during-outgoing-sessions'] === 'Y'} onChange={(e) => handleCheckbox('keep-awake-during-outgoing-sessions', e)} /> 
                <div className="box"></div> <span>传出会话期间保持屏幕常亮</span>
            </label>
            <label className="rs-checkbox">
                <input type="checkbox" checked={options['allow-ask-for-note'] === 'Y'} onChange={(e) => handleCheckbox('allow-ask-for-note', e)} /> 
                <div className="box"></div> <span>在连接结束时请求备注</span>
            </label>
          </div>
      </div>
    </div>
  );
}
