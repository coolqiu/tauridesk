import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Lock, Monitor, Info } from 'lucide-react';
import RemoteToolbar from '../components/RemoteToolbar';
import '../index.css';

// Check if WebCodecs is supported at module level
const isWebCodecsSupported = typeof VideoDecoder !== 'undefined' && typeof VideoDecoder.isConfigSupported !== 'undefined';

export default function SessionWindow() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [viewMode, setViewMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const codecSupportSentRef = useRef<boolean>(false);
  const [passwordReq, setPasswordReq] = useState<{ id: string, title: string, text: string } | null>(null);

  // Refs for WebCodecs state
  const decoderRef = useRef<VideoDecoder | null>(null);
  const isWebCodecsSupportedRef = useRef(isWebCodecsSupported);
  const pendingDimensionsRef = useRef<{ width: number, height: number } | null>(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const needsKeyFrameRef = useRef(true);
  const lastChunkRef = useRef<Uint8Array | null>(null);
  const frameCountRef = useRef(0);
  const lastPtsRef = useRef(BigInt(0));
  const currentCodecRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  useEffect(() => {
    const detectAndSendCodecSupport = async () => {
      const testCodec = async (codecStr: string): Promise<boolean> => {
        try {
          const supported = await VideoDecoder.isConfigSupported({
            codec: codecStr,
            codedWidth: 1920,
            codedHeight: 1080,
            optimizeForLatency: true,
          });
          return !!supported.supported;
        } catch {
          return false;
        }
      };

      let vp9Supported = false;
      for (const variation of ['vp09.00.10.08', 'vp09.01.10.08', 'vp9']) {
        if (await testCodec(variation)) { vp9Supported = true; break; }
      }

      let h264Supported = false;
      for (const variation of ['avc1.42001f', 'avc1.4D001F', 'avc1.64001F', 'h264']) {
        if (await testCodec(variation)) { h264Supported = true; break; }
      }

      let av1Supported = false;
      for (const variation of ['av01.0.08M.08', 'av01.0.04M.08', 'av1']) {
        if (await testCodec(variation)) { av1Supported = true; break; }
      }

      let vp8Supported = false;
      for (const variation of ['vp08.00.10.08', 'vp08.01.10.08', 'vp8']) {
        if (await testCodec(variation)) { vp8Supported = true; break; }
      }

      isWebCodecsSupportedRef.current = vp8Supported || vp9Supported || h264Supported || av1Supported;
      
      if (!isWebCodecsSupportedRef.current) {
        setStatus('WebCodecs Not Supported');
        return;
      }

      if (id && !codecSupportSentRef.current) {
        codecSupportSentRef.current = true;
        const reportVp8 = vp8Supported && !(vp9Supported || av1Supported);
        invoke('set_browser_supported_codecs', {
          vp8: reportVp8,
          vp9: vp9Supported,
          h264: h264Supported,
          av1: av1Supported
        }).catch(() => {});
      }
    };

    detectAndSendCodecSupport();

    const CODEC_MAP: Record<number, string> = { 0: 'VP8', 1: 'VP9', 2: 'H264', 3: 'H265', 4: 'AV1' };
    const videoChannel = new Channel<any>();

    const autoCloseOnFrame = () => {
        if (passwordReq) setPasswordReq(null);
    };

    const handleStateUpdate = async () => {
        if (!id) return;
        try {
            const connected = await invoke<boolean>('is_session_connected', { id });
            if (connected) setPasswordReq(null);
        } catch {}
    };

    let pollInterval: any = null;
    if (passwordReq) pollInterval = setInterval(handleStateUpdate, 1000);

    const initWebCodecs = async (format: string, width: number, height: number) => {
      try {
        if (decoderRef.current) {
          decoderRef.current.close();
          decoderRef.current = null;
        }

        const codecVariations: string[] = [];
        const normalizedFormat = format.toUpperCase();
        switch (normalizedFormat) {
          case 'VP8': codecVariations.push('vp8', 'vp08.00.10.08'); break;
          case 'VP9': codecVariations.push('vp9', 'vp09.00.10.08'); break;
          case 'H264': codecVariations.push('h264', 'avc1.42001e', 'avc1.42001f'); break;
          case 'AV1': codecVariations.push('av1', 'av01.0.08M.08'); break;
        }

        let foundConfig: any = null;
        for (const c of codecVariations) {
          const config = { codec: c, codedWidth: width, codedHeight: height, optimizeForLatency: true };
          try {
            const supported = await VideoDecoder.isConfigSupported(config);
            if (supported.supported) { foundConfig = config; break; }
          } catch {}
        }

        if (!foundConfig) {
          isInitializingRef.current = false;
          return;
        }

        let frameCount = 0;
        const newDecoder = new VideoDecoder({
          output: (frame: VideoFrame) => {
            frameCount++;
            const canvas = canvasRef.current;
            if (!canvas) {
              frame.close();
              return;
            }
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
              frame.close();
              return;
            }

            if (frame.displayWidth !== canvas.width || frame.displayHeight !== canvas.height) {
              canvas.width = frame.displayWidth;
              canvas.height = frame.displayHeight;
            }

            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
            frame.close();
            autoCloseOnFrame();
            if (status !== 'WebCodecs Decoding...') setStatus('WebCodecs Decoding...');
          },
          error: (e: any) => {
            console.error('❌ [WebCodecs] Decoding error:', e);
            setStatus(`WebCodecs Error: ${e.message || 'Check console'}`);
            if (decoderRef.current) {
                try { decoderRef.current.close(); } catch {}
                decoderRef.current = null;
            }
            isInitializingRef.current = false;
            needsKeyFrameRef.current = true;
            if (id) invoke('refresh_video', { id }).catch(() => {});
          }
        });

        newDecoder.configure(foundConfig);
        decoderRef.current = newDecoder;
        lastDimensionsRef.current = { width, height };
        currentCodecRef.current = format;
      } catch (err) {
        console.error('❌ [WebCodecs] Initialization failed:', err);
      } finally {
        isInitializingRef.current = false;
      }
    };

    const handleLegacyRgba = (pixelBytes: Uint8ClampedArray, w: number, h: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      if (w !== canvas.width || h !== canvas.height) {
        canvas.width = w;
        canvas.height = h;
        lastDimensionsRef.current = { width: w, height: h };
      }

      const imgData = new ImageData(w, h);
      const bytesPerPixel = pixelBytes.length / (w * h);
      
      if (bytesPerPixel === 4) {
        imgData.data.set(pixelBytes);
      } else {
        for (let i = 0; i < pixelBytes.length / 3; i++) {
          imgData.data[i*4] = pixelBytes[i*3];
          imgData.data[i*4+1] = pixelBytes[i*3+1];
          imgData.data[i*4+2] = pixelBytes[i*3+2];
          imgData.data[i*4+3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      autoCloseOnFrame();
      if (status !== 'Software Rendering') setStatus('Software Rendering');
    };

    videoChannel.onmessage = (rawPayload: any) => {
      if (!rawPayload) return;
      
      let payload: Uint8Array;
      if (rawPayload instanceof Uint8Array) payload = rawPayload;
      else if (Array.isArray(rawPayload)) payload = new Uint8Array(rawPayload);
      else if (rawPayload instanceof ArrayBuffer) payload = new Uint8Array(rawPayload);
      else if (rawPayload.buffer instanceof ArrayBuffer) payload = new Uint8Array(rawPayload.buffer);
      else return;
      
      const buffer = payload.buffer;
      const view = new DataView(buffer, payload.byteOffset, payload.byteLength);
      const typeByte = view.getUint8(0);
      
      if (typeByte === 255) {
        const w = view.getUint32(1, true);
        const h = view.getUint32(5, true);
        handleLegacyRgba(new Uint8ClampedArray(buffer, 9), w, h);
        return;
      }

      const codec = CODEC_MAP[typeByte];
      if (!codec || !isWebCodecsSupportedRef.current) return;

      const isKey = view.getUint8(1) === 1;
      let timestamp = view.getBigInt64(2, true);
      const data = new Uint8Array(buffer, payload.byteOffset + 10, payload.byteLength - 10);
      lastChunkRef.current = data;

      // Bitstream Auditor (Every 100 frames)
      if (frameCountRef.current % 100 === 0) {
          const hex = Array.from(data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`🔍 [WebCodecs] Frame Payload Hex (First 16B): ${hex} | Key=${isKey} | Codec=${codec} | Size=${data.length}`);
      }

      if (needsKeyFrameRef.current && !isKey) return;

      if (timestamp <= lastPtsRef.current && !isKey) {
          timestamp = lastPtsRef.current + BigInt(33); 
      }
      lastPtsRef.current = timestamp;

      const dims = pendingDimensionsRef.current || { width: 1920, height: 1080 };
      const needsInit = !decoderRef.current || 
                        currentCodecRef.current !== codec || 
                        dims.width !== lastDimensionsRef.current.width;

      if (needsInit && !isInitializingRef.current) {
         isInitializingRef.current = true;
         initWebCodecs(codec, dims.width, dims.height);
      }

      if (isKey) needsKeyFrameRef.current = false;

      const activeDecoder = decoderRef.current;
      if (activeDecoder && activeDecoder.state === 'configured') {
        try {
          activeDecoder.decode(new EncodedVideoChunk({
            type: isKey ? 'key' : 'delta',
            timestamp: Number(timestamp),
            data: data
          }));
          frameCountRef.current++;
        } catch { 
          needsKeyFrameRef.current = true;
          if (id) invoke('refresh_video', { id }).catch(() => {});
        }
      }
    };

    if (id) {
       invoke('force_clear_video_channels', { id })
         .then(() => invoke('listen_video_stream', { id, channel: videoChannel }))
         .catch(() => {});
    }

    const unlistenDisplaySize = listen('video-display-size', (event: any) => {
      pendingDimensionsRef.current = { width: event.payload.width, height: event.payload.height };
    });

    const unlistenMsgbox = listen<{ id: string, msgtype: string, title: string, text: string }>('msgbox', (event) => {
      if (event.payload.id === id) {
        if (event.payload.msgtype.includes('password')) setPasswordReq({ id: event.payload.id, title: event.payload.title, text: event.payload.text });
        else if (event.payload.msgtype === "success") { setStatus('Connected successfully.'); setPasswordReq(null); }
      }
    });

    const unlistenAuth = listen('connection-authorized', (event: any) => {
        if (event.payload.peer_id?.replace(/\s/g, '') === id?.replace(/\s/g, '')) setPasswordReq(null);
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (id) {
        invoke('unlisten_video_stream', { id }).catch(() => {});
        invoke('force_clear_video_channels', { id }).catch(() => {});
      }
      unlistenDisplaySize.then(f => f());
      unlistenMsgbox.then(f => f());
      unlistenAuth.then(f => f());
      if (decoderRef.current) {
        decoderRef.current.close();
        decoderRef.current = null;
      }
    };
  }, [id]);

  const handlePasswordSubmit = async (password: string) => {
    if (!passwordReq) return;
    try {
      await invoke('submit_password', { id: passwordReq.id, password });
      setPasswordReq(null);
    } catch (error) { alert("Submission failed: " + error); }
  };

  const getCoords = (event: React.MouseEvent | React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !lastDimensionsRef.current.width) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) * (lastDimensionsRef.current.width / rect.width));
    const y = Math.round((event.clientY - rect.top) * (lastDimensionsRef.current.height / rect.height));
    return { x, y };
  };

  return (
    <div className="flex-col h-screen w-screen overflow-hidden bg-black">
      {/* 1. Status Bar (Industrial) */}
      <div className="rd-titlebar" style={{ height: '36px', background: '#1A1A1A', borderBottom: '1px solid #333' }}>
          <div className="flex-row gap-3 px-4">
             <div className="m-blue"><Monitor size={14} /></div>
             <span style={{ fontSize: '12px', color: '#AAA' }}>会话: {id}</span>
             <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>|</span>
             <span style={{ fontSize: '12px', color: '#888' }}>状态: {status}</span>
          </div>
          <div className="flex-row px-4 gap-4">
             <Info size={14} style={{ color: '#666', cursor: 'help' }} />
          </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-auto bg-[#0a0a0a]">
        <RemoteToolbar 
          id={id || ''} 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <canvas 
          ref={canvasRef} 
          style={{ 
            maxWidth: viewMode === 'original' ? 'none' : '100%', 
            maxHeight: viewMode === 'original' ? 'none' : '100%', 
            width: viewMode === 'original' ? `${lastDimensionsRef.current.width}px` : '100%',
            height: viewMode === 'original' ? `${lastDimensionsRef.current.height}px` : '100%',
            objectFit: viewMode === 'contain' ? 'contain' : (viewMode === 'cover' ? 'cover' : 'none'),
            cursor: 'none' 
          }}
          onMouseDown={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: true }); }}
          onMouseUp={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: false }); }}
          onMouseMove={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_move', { id, ...c }); }}
          onWheel={e => { const c = getCoords(e); if (c && id) invoke('send_wheel', { id, ...c, deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) }); }}
          onContextMenu={e => e.preventDefault()}
          tabIndex={0}
          onKeyDown={e => id && invoke('send_key_event', { id, key: e.code, pressed: true })}
          onKeyUp={e => id && invoke('send_key_event', { id, key: e.code, pressed: false })}
        />
      </div>

      {/* 2. Industrial Password Modal */}
      {passwordReq && (
        <div className="rs-modal-overlay">
          <div className="rs-modal-content" style={{ maxWidth: '400px', borderRadius: '12px' }}>
            <div className="flex-col items-center mb-8">
               <div className="m-blue mb-4"><Lock size={40} strokeWidth={1.5} /></div>
               <h2 className="rs-modal-title" style={{ fontSize: '20px' }}>{passwordReq.title}</h2>
               <p className="rd-panel-desc text-center mt-2">{passwordReq.text}</p>
            </div>
            
            <div className="rs-modal-row">
               <input 
                type="password" 
                className="rs-input-gray"
                autoFocus 
                placeholder="请输入远程访问密码"
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="rs-modal-footer">
              <button 
                className="rs-btn-blue" 
                style={{ background: '#F1F3F4', color: '#202124', boxShadow: 'none' }}
                onClick={() => setPasswordReq(null)}
              >
                取消
              </button>
              <button 
                className="rs-btn-blue" 
                onClick={() => { 
                   const input = document.querySelector('.rs-input-gray') as HTMLInputElement;
                   handlePasswordSubmit(input.value);
                }}
              >
                登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
