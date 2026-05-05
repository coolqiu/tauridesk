import { useServerStore } from '../../../store/serverStore';

export default function DisplayTab() {
  const { options, setOption } = useServerStore();

  const handleRadio = (name: string, value: string) => {
    setOption(name, value);
  };

  const dSize = options['view_style'] || 'original';
  const dScroll = options['scroll_style'] || 'scrollauto';
  const dQuality = options['image_quality'] || 'balanced';
  const dCodec = options['codec-preference'] || 'auto';
  const touchSpeed = options['trackpad-speed'] || '100';

  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      {/* 1. 默认显示方式 */}
      <div className="rs-flat-card">
          <div className="card-title">默认显示方式</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-size" checked={dSize === 'original'} onChange={() => handleRadio('view_style', 'original')} /> 
                  <div className="dot"></div> <span>原始尺寸</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-size" checked={dSize === 'adaptive'} onChange={() => handleRadio('view_style', 'adaptive')} /> 
                  <div className="dot"></div> <span>适应窗口</span>
              </label>
          </div>
      </div>

      {/* 2. 默认滚动方式 */}
      <div className="rs-flat-card">
          <div className="card-title">默认滚动方式</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'scrollauto'} onChange={() => handleRadio('scroll_style', 'scrollauto')} /> 
                  <div className="dot"></div> <span>自动滚动</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'scrollbar'} onChange={() => handleRadio('scroll_style', 'scrollbar')} /> 
                  <div className="dot"></div> <span>滚动条</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'scrolledge'} onChange={() => handleRadio('scroll_style', 'scrolledge')} /> 
                  <div className="dot"></div> <span>边缘滚动</span>
              </label>
          </div>
      </div>

      {/* 3. 默认图像质量 */}
      <div className="rs-flat-card">
          <div className="card-title">默认图像质量</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'best'} onChange={() => handleRadio('image_quality', 'best')} /> 
                  <div className="dot"></div> <span>画质最优化</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'balanced'} onChange={() => handleRadio('image_quality', 'balanced')} /> 
                  <div className="dot"></div> <span>平衡</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'low'} onChange={() => handleRadio('image_quality', 'low')} /> 
                  <div className="dot"></div> <span>速度最优化</span>
              </label>
          </div>
      </div>

      {/* 4. 默认编解码 */}
      <div className="rs-flat-card">
          <div className="card-title">默认编解码</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-codec" checked={dCodec === 'auto'} onChange={() => handleRadio('codec-preference', 'auto')} /> 
                  <div className="dot"></div> <span>自动</span>
              </label>
              <div className="grid grid-cols-2" style={{ marginLeft: '30px', opacity: 0.8, marginTop: '5px' }}>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'vp8'} onChange={() => handleRadio('codec-preference', 'vp8')} /> <div className="dot"></div> <span>VP8</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'vp9'} onChange={() => handleRadio('codec-preference', 'vp9')} /> <div className="dot"></div> <span>VP9</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'av1'} onChange={() => handleRadio('codec-preference', 'av1')} /> <div className="dot"></div> <span>AV1</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'h264'} onChange={() => handleRadio('codec-preference', 'h264')} /> <div className="dot"></div> <span>H264</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'h265'} onChange={() => handleRadio('codec-preference', 'h265')} /> <div className="dot"></div> <span>H265</span></label>
              </div>
          </div>
      </div>

      {/* 5. 触控板速度 */}
      <div className="rs-flat-card">
          <div className="card-title">默认触控板速度</div>
          <div className="flex-row" style={{ gap: '15px', marginTop: '10px' }}>
              <input 
                type="range" 
                style={{ flex: 1, accentColor: 'var(--rd-accent)', height: '4px', cursor: 'pointer' }} 
                value={touchSpeed} 
                onChange={(e) => setOption('trackpad-speed', e.target.value)} 
              />
              <div style={{ background: '#F2F2F2', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>{touchSpeed}</div>
              <span style={{ fontSize: '12px', opacity: 0.5 }}>%</span>
          </div>
      </div>
    </div>
  );
}
