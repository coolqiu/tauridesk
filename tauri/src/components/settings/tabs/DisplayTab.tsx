import { useServerStore } from '../../../store/serverStore';

export default function DisplayTab() {
  const { options, setOption } = useServerStore();

  const handleRadio = (name: string, value: string) => {
    setOption(name, value);
  };

  const dSize = options['display-size'] || 'original';
  const dScroll = options['display-scroll'] || 'auto';
  const dQuality = options['display-quality'] || 'balance';
  const dCodec = options['display-codec'] || 'auto';
  const touchSpeed = options['touch-speed'] || '100';

  return (
    <div className="flex-col w-full h-full" style={{ padding: '12px 15px 40px 15px' }}>
      
      {/* 1. 默认显示方式 */}
      <div className="rs-flat-card">
          <div className="card-title">默认显示方式</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-size" checked={dSize === 'original'} onChange={() => handleRadio('display-size', 'original')} /> 
                  <div className="dot"></div> <span>原始尺寸</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-size" checked={dSize === 'fit'} onChange={() => handleRadio('display-size', 'fit')} /> 
                  <div className="dot"></div> <span>适应窗口</span>
              </label>
          </div>
      </div>

      {/* 2. 默认滚动方式 */}
      <div className="rs-flat-card">
          <div className="card-title">默认滚动方式</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'auto'} onChange={() => handleRadio('display-scroll', 'auto')} /> 
                  <div className="dot"></div> <span>自动滚动</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'scrollbar'} onChange={() => handleRadio('display-scroll', 'scrollbar')} /> 
                  <div className="dot"></div> <span>滚动条</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-scroll" checked={dScroll === 'edge'} onChange={() => handleRadio('display-scroll', 'edge')} /> 
                  <div className="dot"></div> <span>边缘滚动</span>
              </label>
          </div>
      </div>

      {/* 3. 默认图像质量 */}
      <div className="rs-flat-card">
          <div className="card-title">默认图像质量</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'quality'} onChange={() => handleRadio('display-quality', 'quality')} /> 
                  <div className="dot"></div> <span>画质最优化</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'balance'} onChange={() => handleRadio('display-quality', 'balance')} /> 
                  <div className="dot"></div> <span>平衡</span>
              </label>
              <label className="rs-radio">
                  <input type="radio" name="d-quality" checked={dQuality === 'speed'} onChange={() => handleRadio('display-quality', 'speed')} /> 
                  <div className="dot"></div> <span>速度最优化</span>
              </label>
          </div>
      </div>

      {/* 4. 默认编解码 */}
      <div className="rs-flat-card">
          <div className="card-title">默认编解码</div>
          <div className="flex-col">
              <label className="rs-radio">
                  <input type="radio" name="d-codec" checked={dCodec === 'auto'} onChange={() => handleRadio('display-codec', 'auto')} /> 
                  <div className="dot"></div> <span>自动</span>
              </label>
              <div className="grid grid-cols-2" style={{ marginLeft: '30px', opacity: 0.8, marginTop: '5px' }}>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'vp8'} onChange={() => handleRadio('display-codec', 'vp8')} /> <div className="dot"></div> <span>VP8</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'vp9'} onChange={() => handleRadio('display-codec', 'vp9')} /> <div className="dot"></div> <span>VP9</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'av1'} onChange={() => handleRadio('display-codec', 'av1')} /> <div className="dot"></div> <span>AV1</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'h264'} onChange={() => handleRadio('display-codec', 'h264')} /> <div className="dot"></div> <span>H264</span></label>
                  <label className="rs-radio"><input type="radio" name="d-codec" checked={dCodec === 'h265'} onChange={() => handleRadio('display-codec', 'h265')} /> <div className="dot"></div> <span>H265</span></label>
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
                onChange={(e) => setOption('touch-speed', e.target.value)} 
              />
              <div style={{ background: '#F2F2F2', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>{touchSpeed}</div>
              <span style={{ fontSize: '12px', opacity: 0.5 }}>%</span>
          </div>
      </div>
    </div>
  );
}
