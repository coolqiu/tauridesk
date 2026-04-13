import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Lock, Monitor, Info, Activity, Scaling, Maximize, RotateCcw, MousePointer2, ExternalLink, Keyboard, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RemoteToolbar from '../components/RemoteToolbar';
import '../index.css';

// Check if WebCodecs is supported at module level
const isWebCodecsSupported = typeof VideoDecoder !== 'undefined' && typeof VideoDecoder.isConfigSupported !== 'undefined';

export default function SessionWindow() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [viewMode, setViewMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const codecSupportSentRef = useRef<boolean>(false);
  const [passwordReq, setPasswordReq] = useState<{ id: string, title: string, text: string } | null>(null);
  const [displays, setDisplays] = useState<any[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<number>(0);
  const [showRemoteCursor, setShowRemoteCursor] = useState<boolean>(true);
  const showRemoteCursorRef = useRef(true);
  const viewModeRef = useRef<'contain' | 'cover' | 'original'>('contain');
  const [perfStats, setPerfStats] = useState({ fps: 0, speed: '-', delay: '-', codec: '' });
  const [remoteOptions, setRemoteOptions] = useState<Record<string, boolean>>({
    'block-input': false,
    'privacy-mode': false,
    'lock-kb': false
  });
  const lastLoggedFrameCountRef = useRef(0);

  // Refs for WebCodecs state to ensure consistency in event handlers and avoid loops
  const decoderRef = useRef<VideoDecoder | null>(null);
  const isWebCodecsSupportedRef = useRef(isWebCodecsSupported);
  const pendingDimensionsRef = useRef<{ width: number, height: number } | null>(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const needsKeyFrameRef = useRef(true);
  const lastSkippedRef = useRef(0); // Default to no skipping, start from beginning
  const lastChunkRef = useRef<Uint8Array | null>(null);
  const frameCountRef = useRef(0);
  const lastPtsRef = useRef(BigInt(0));
  const currentCodecRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // 远端光标状态
  const cursorXRef = useRef(0);
  const cursorYRef = useRef(0);
  const cursorDivRef = useRef<HTMLDivElement | null>(null);
  const cursorImageCacheRef = useRef<Map<string, string>>(new Map()); // cursorId -> dataURI
  const currentCursorIdRef = useRef<string>('');

  useEffect(() => {
    // Detect which codecs are supported by this browser via WebCodecs and inform Rust
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

      // Priority detection: try to find at least one reliable variation
      // Include higher level (4.0/4.1) for 1080p support
      let vp9Supported = false;
      for (const variation of ['vp09.00.41.08', 'vp09.00.40.08', 'vp09.00.10.08', 'vp09.02.41.08', 'vp09.01.41.08', 'vp09.01.10.08', 'vp9']) {
        if (await testCodec(variation)) {
          vp9Supported = true;
          console.log(`🎬 [WebCodecs] Selected VP9 codec: ${variation} (supports 1080p)`);
          break;
        }
      }

      let h264Supported = false;
      for (const variation of ['avc1.42001f', 'avc1.4D001F', 'avc1.64001F', 'h264']) {
        if (await testCodec(variation)) { h264Supported = true; break; }
      }

      let av1Supported = false;
      for (const variation of ['av01.0.08M.08', 'av01.0.04M.08', 'av1']) {
        if (await testCodec(variation)) { av1Supported = true; break; }
      }

      // VP8 is last priority
      let vp8Supported = false;
      for (const variation of ['vp08.00.10.08', 'vp08.01.10.08', 'vp8']) {
        if (await testCodec(variation)) { vp8Supported = true; break; }
      }

      isWebCodecsSupportedRef.current = vp8Supported || vp9Supported || h264Supported || av1Supported;

      console.log(`🎬 [WebCodecs] Browser codec support: vp8=${vp8Supported}, vp9=${vp9Supported}, h264=${h264Supported}, av1=${av1Supported}`);

      if (!isWebCodecsSupportedRef.current) {
        console.warn('⚠️ [WebCodecs] No hardware acceleration supported, falling back to legacy.');
        setStatus('WebCodecs Not Supported');
        return;
      }

      if (id && !codecSupportSentRef.current) {
        codecSupportSentRef.current = true;

        invoke('set_browser_supported_codecs', {
          vp8: vp8Supported,
          vp9: vp9Supported,
          h264: h264Supported,
          av1: av1Supported
        }).catch(err => console.error("❌ Failed to send codec support to Rust:", err));
      }
    };

    detectAndSendCodecSupport();

    const CODEC_MAP: Record<number, string> = { 0: 'VP8', 1: 'VP9', 2: 'H264', 3: 'H265', 4: 'AV1' };
    const videoChannel = new Channel<any>();

    const autoCloseOnFrame = () => {
      if (passwordReq) {
        console.log("🚀 [Force Close] Video activity detected, closing password modal.");
        setPasswordReq(null);
      }
    };

    const handleStateUpdate = async () => {
      if (!id) return;
      try {
        const connected = await invoke<boolean>('is_session_connected', { id });
        if (connected) setPasswordReq(null);
      } catch (err) { console.error("❌ [Auth State] Failed to check status:", err); }
    };

    let pollInterval: any = null;
    if (passwordReq) pollInterval = setInterval(handleStateUpdate, 1000);

    const initWebCodecs = async (format: string, width: number, height: number) => {
      try {
        if (decoderRef.current) {
          decoderRef.current.close();
          decoderRef.current = null;
        }

        console.log(`🎬 [WebCodecs] Initializing decoder for ${format}, ${width}x${height}`);

        const codecVariations: string[] = [];
        const normalizedFormat = format.toUpperCase();
        switch (normalizedFormat) {
          case 'VP8': codecVariations.push('vp8', 'vp08.00.10.08'); break;
          case 'VP9': codecVariations.push('vp9', 'vp09.00.10.08'); break;
          case 'H264': codecVariations.push('h264', 'avc1.42001e', 'avc1.42001f'); break;
          case 'AV1': codecVariations.push('av1', 'av01.0.08M.08'); break;
        }

        console.log(`🎬 [WebCodecs] Trying configs for ${format}:`, codecVariations);

        let foundConfig: any = null;
        for (const c of codecVariations) {
          const config: VideoDecoderConfig = {
            codec: c,
            codedWidth: width,
            codedHeight: height,
            // 🚀 智能分流：VP9 硬解有致命Bug強製軟解，H264/AV1 啟動滿血純硬件解碼
            hardwareAcceleration: c.startsWith('vp') ? 'prefer-software' : 'prefer-hardware',
            optimizeForLatency: true,
          };
          
          Object.assign(config, { _requestedAcceleration: config.hardwareAcceleration });
          try {
            const supported = await VideoDecoder.isConfigSupported(config);
            if (supported.supported) { foundConfig = config; break; }
          } catch { }
        }

        if (!foundConfig) {
          console.error(`❌ [WebCodecs] No supported configuration found for ${format}`);
          isInitializingRef.current = false;
          return;
        }

        let frameCount = 0;
        const newDecoder = new VideoDecoder({
          output: (frame: VideoFrame) => {
            frameCount++;
            if (frameCount % 60 === 1) {
              console.log(`🎬 [WebCodecs] Decoded frame #${frameCount}: ${frame.displayWidth}x${frame.displayHeight}`);
            }
            const canvas = canvasRef.current;
            if (!canvas) {
              if (frameCount % 60 === 1) console.warn('⚠️ [WebCodecs] Output received but canvas is null');
              frame.close();
              return;
            }
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
              frame.close();
              return;
            }

            if (frame.displayWidth !== canvas.width || frame.displayHeight !== canvas.height) {
              console.log(`📏 [WebCodecs] Resizing canvas to ${frame.displayWidth}x${frame.displayHeight}`);
              canvas.width = frame.displayWidth;
              canvas.height = frame.displayHeight;
            }

            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
            frame.close();
            autoCloseOnFrame();
            
            // WebCodecs standard doesn't officially expose `.acceleration` on VideoDecoder synchronously across all browsers yet.
            // We use the requested acceleration strategy to reliably report intended hardware mode.
            const reqMode = (decoderRef.current as any)?._requestedAcceleration || 'prefer-software';
            const modeStr = reqMode === 'prefer-hardware' ? '[GPU]' : '[CPU]';
            if (status !== `WebCodecs ${modeStr}`) setStatus(`WebCodecs ${modeStr}`);
          },
          error: (e: any) => {
            const hex = Array.from(lastChunkRef.current?.subarray(0, 16) || [])
              .map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.error(`❌ WebCodecs 拒绝解码！原因: ${e.message} | 数据指纹: ${hex}`);
            setStatus(`WebCodecs Error: ${e.message}`);

            // If hardware acceleration fails, force re-init with software fallback
            if (decoderRef.current) {
              try { decoderRef.current.close(); } catch { }
              decoderRef.current = null;
            }
            isInitializingRef.current = false;
            needsKeyFrameRef.current = true;
            lastSkippedRef.current = 0;
            // Request new key frame after reset
            setTimeout(() => {
              if (id) invoke('refresh_video', { id }).catch(() => { });
            }, 100);
          }
        });

        newDecoder.configure(foundConfig);
        (newDecoder as any)._requestedAcceleration = foundConfig._requestedAcceleration;
        decoderRef.current = newDecoder;
        lastDimensionsRef.current = { width, height };
        currentCodecRef.current = format;
        console.log(`✅ [WebCodecs] Decoder initialized successfully for ${format} ${width}x${height}`);
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
          imgData.data[i * 4] = pixelBytes[i * 3];
          imgData.data[i * 4 + 1] = pixelBytes[i * 3 + 1];
          imgData.data[i * 4 + 2] = pixelBytes[i * 3 + 2];
          imgData.data[i * 4 + 3] = 255;
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
      const rawData = new Uint8Array(buffer, payload.byteOffset + 10, payload.byteLength - 10);

      let isActuallyKey = isKey;
      let data = rawData;

      if (codec === 'VP9') {
        // 🚨 OVERRIDE RUST BACKEND 🚨
        // Rust desk sometimes incorrectly Flags delta frames as keyFrames (isKey=1).
        // A true VP9 keyframe MUST have the sync code 0x49 0x83 0x42 immediately after the frame marker.
        if (data.length >= 4 && data[1] === 0x49 && data[2] === 0x83 && data[3] === 0x42) {
          isActuallyKey = true;
        } else {
          isActuallyKey = false; // It's a delta frame, no matter what Rust says!
        }
      }

      // If we need a key frame but this isn't one, skip it
      if (needsKeyFrameRef.current && !isActuallyKey) {
        return;
      }

      // MONOTONIC PTS
      if (timestamp <= lastPtsRef.current) timestamp = lastPtsRef.current + BigInt(33333);
      lastPtsRef.current = timestamp;

      // RE-INIT CHECK
      const dims = pendingDimensionsRef.current || { width: 1920, height: 1080 };
      const needsInit = !decoderRef.current ||
        currentCodecRef.current !== codec ||
        dims.width !== lastDimensionsRef.current.width;

      if (needsInit && !isInitializingRef.current) {
        const curW = dims.width || 1920;
        const curH = dims.height || 1080;
        console.log(`⚙️ [WebCodecs] Re-initializing for ${codec} @ ${curW}x${curH}`);
        isInitializingRef.current = true;
        if (decoderRef.current) {
          try { decoderRef.current.close(); } catch { }
          decoderRef.current = null;
        }
        initWebCodecs(codec, curW, curH);
        return;
      }

      if (isInitializingRef.current || !decoderRef.current) return;

      if (isActuallyKey) needsKeyFrameRef.current = false;

      // Save last chunk for error debugging
      lastChunkRef.current = data.slice();

      // DECODE
      const activeDecoder = decoderRef.current;
      if (activeDecoder && activeDecoder.state === 'configured') {
        try {
          activeDecoder.decode(new EncodedVideoChunk({
            type: isActuallyKey ? 'key' : 'delta',
            timestamp: Number(timestamp), // PTS from Rust is milliseconds, WebCodecs needs microseconds
            data: data.slice() // Safe clone for GPU memory management
          }));
          frameCountRef.current++;
        } catch (e: any) {
          // Error will be handled by the decoder's error callback
          const hex = Array.from(lastChunkRef.current?.subarray(0, 16) || [])
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.error(`❌ GPU 拒绝解码！原因: ${e.message} | 数据指纹: ${hex}`);
          // Don't need to do anything here - error callback already handles it
        }
      }
    };

    if (id) {
      invoke('force_clear_video_channels', { id })
        .then(() => invoke('listen_video_stream', { id, channel: videoChannel }))
        .catch(console.error);
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

    const unlistenDisplays = listen('displays-updated', (event: any) => {
      console.log("🖥️ [Tauri Event] DISPLAYS_UPDATED:", event.payload.length, "screens found.");
      setDisplays(event.payload);
    });

    const unlistenCurrentDisplay = listen('current-display-changed', (event: any) => {
      const newIdx = event.payload;
      console.log(`🖥️ [Tauri Event] CURRENT_DISPLAY_CHANGED -> Index: ${newIdx} (Display ${newIdx + 1})`);
      setCurrentDisplay(newIdx);
    });

    // 📍 远端光标渲染事件监听
    const unlistenCursorPos = listen('cursor-position', (event: any) => {
      const { x, y } = event.payload;
      const canvas = canvasRef.current;
      if (!canvas || !lastDimensionsRef.current.width) return;
      const rect = canvas.getBoundingClientRect();
      // 将远端坐标映射到本地 canvas 展示坐标
      const scaleX = rect.width / lastDimensionsRef.current.width;
      const scaleY = rect.height / lastDimensionsRef.current.height;
      cursorXRef.current = rect.left + x * scaleX;
      cursorYRef.current = rect.top + y * scaleY;
      if (!cursorDivRef.current) return;
      if (!showRemoteCursorRef.current) {
        cursorDivRef.current.style.display = 'none';
        return;
      }
      cursorDivRef.current.style.left = `${cursorXRef.current}px`;
      cursorDivRef.current.style.top = `${cursorYRef.current}px`;
      cursorDivRef.current.style.display = 'block';
    });

    const unlistenCursorId = listen('cursor-id', (event: any) => {
      const newId = String(event.payload);
      currentCursorIdRef.current = newId;
      const cached = cursorImageCacheRef.current.get(newId);
      if (cached && cursorDivRef.current && showRemoteCursorRef.current) {
        cursorDivRef.current.style.backgroundImage = `url(${cached})`;
      }
    });

    const unlistenCursorData = listen('cursor-data', (event: any) => {
      const { id, hotx, hoty, width, height, colors } = event.payload;
      try {
        // 将 base64 RGBA 转为 dataURI
        const binaryStr = atob(colors);
        const bytes = new Uint8ClampedArray(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const offscreen = new OffscreenCanvas(width, height);
        const ctx2 = offscreen.getContext('2d')!;
        const imgData = new ImageData(bytes, width, height);
        ctx2.putImageData(imgData, 0, 0);
        offscreen.convertToBlob().then(blob => {
          const dataUri = URL.createObjectURL(blob);
          const cursorId = String(id);
          cursorImageCacheRef.current.set(cursorId, dataUri);
          if (currentCursorIdRef.current === cursorId && cursorDivRef.current) {
            cursorDivRef.current.style.backgroundImage = `url(${dataUri})`;
            cursorDivRef.current.style.backgroundSize = `${width}px ${height}px`;
            cursorDivRef.current.style.width = `${width}px`;
            cursorDivRef.current.style.height = `${height}px`;
            cursorDivRef.current.style.marginLeft = `${-hotx}px`;
            cursorDivRef.current.style.marginTop = `${-hoty}px`;
          }
        });
      } catch (e) {
        console.error('❌ [Cursor] Failed to render cursor image:', e);
      }
    });

    // 📋 剪贴板双向同步
    const unlistenRemoteClipboard = listen<string>('remote-clipboard', (event) => {
      const text = event.payload;
      if (text) navigator.clipboard.writeText(text).catch(() => {});
    });

    const unlistenQualityStatus = listen<{ speed: string, delay: string }>('quality-status', (event) => {
      setPerfStats(prev => ({
        ...prev,
        speed: event.payload.speed,
        delay: event.payload.delay
      }));
    });

    const unlistenRemoteOption = listen<{ key: string, value: boolean }>('remote-option-changed', (event) => {
      setRemoteOptions(prev => ({
        ...prev,
        [event.payload.key]: event.payload.value
      }));
    });

    // 监听本地 paste，将内容发送给远端
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain');
      if (text && id) invoke('send_clipboard_text', { id, text }).catch(() => {});
    };
    window.addEventListener('paste', handlePaste);

    // 📊 Trajectory Stats Timer: Update UI every second from refs
    const statsTimer = setInterval(() => {
      const currentCount = frameCountRef.current;
      const fps = currentCount - lastLoggedFrameCountRef.current;
      lastLoggedFrameCountRef.current = currentCount;
      setPerfStats(prev => ({
        ...prev,
        fps,
        codec: currentCodecRef.current || 'None'
      }));
    }, 1000);

    return () => {
      clearInterval(statsTimer);
      if (pollInterval) clearInterval(pollInterval);
      if (id) {
        invoke('unlisten_video_stream', { id }).catch(() => { });
        invoke('force_clear_video_channels', { id }).catch(() => { });
      }
      unlistenDisplaySize.then(f => f());
      unlistenMsgbox.then(f => f());
      unlistenAuth.then(f => f());
      unlistenDisplays.then(f => f());
      unlistenCurrentDisplay.then(f => f());
      unlistenCursorPos.then(f => f());
      unlistenCursorId.then(f => f());
      unlistenCursorData.then(f => f());
      unlistenRemoteClipboard.then(f => f());
      unlistenQualityStatus.then(f => f());
      unlistenRemoteOption.then(f => f());
      window.removeEventListener('paste', handlePaste);
      if (decoderRef.current) {
        decoderRef.current.close();
        decoderRef.current = null;
      }
      // 清理光标 blob URL 缓存
      cursorImageCacheRef.current.forEach(url => URL.revokeObjectURL(url));
      cursorImageCacheRef.current.clear();
      decoderRef.current = null;
    };
  }, [id]);

  // Handle immediate visual toggle for remote cursor
  useEffect(() => {
    showRemoteCursorRef.current = showRemoteCursor;
    if (cursorDivRef.current) {
      if (!showRemoteCursor) {
        cursorDivRef.current.style.display = 'none';
      } else {
        // If we have an active cursor, it will show on next position event
      }
    }
  }, [showRemoteCursor]);

  // Update viewMode ref
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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
    <div className="flex-col h-screen w-screen overflow-hidden" style={{ background: '#000' }}>
      {/* 1. Status Bar (Industrial) */}
      <div className="rd-titlebar" style={{ height: '36px', background: '#1A1A1A', borderBottom: '1px solid #333' }}>
        <div className="flex-row gap-3 px-4">
          <div className="m-blue"><Monitor size={14} /></div>
          <span style={{ fontSize: '12px', color: '#AAA' }}>{t('Session')}: {id}</span>
          <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>|</span>
          <span style={{ fontSize: '12px', color: '#888' }}>{t('Status')}: {status}</span>
        </div>
        <div className="flex-row px-4 gap-4">
          <Info size={14} style={{ color: '#666', cursor: 'help' }} />
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-auto" style={{ background: '#0a0a0a' }}>
        <RemoteToolbar
          id={id || ''}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          displays={displays}
          currentDisplay={currentDisplay}
          showRemoteCursor={showRemoteCursor}
          setShowRemoteCursor={setShowRemoteCursor}
          remoteOptions={remoteOptions}
        />

        {/* 📈 REAL-TIME TRAJECTORY MONITOR */}
        <div className="rd-perf-monitor">
          <div className="rd-perf-header">
            <Activity size={12} /> {t('Session Quality')}
          </div>
          <div className="rd-perf-row">
            <span className="rd-perf-label">{t('Path')}:</span>
            <span className="rd-perf-value active">
              {decoderRef.current ? (status.includes('[GPU]') ? 'HARDWARE+' : 'SOFTWARE') : 'WAITING...'}
            </span>
          </div>
          <div className="rd-perf-row">
            <span className="rd-perf-label">{t('Codec')}:</span>
            <span className="rd-perf-value">{perfStats.codec}</span>
          </div>
          <div className="rd-perf-row">
            <span className="rd-perf-label">{t('FPS')}:</span>
            <span className="rd-perf-value highlight">{perfStats.fps} FPS</span>
          </div>
          <div className="rd-perf-row">
            <span className="rd-perf-label">{t('Speed')}:</span>
            <span className="rd-perf-value">{perfStats.speed}</span>
          </div>
          <div className="rd-perf-row">
            <span className="rd-perf-label">{t('Delay')}:</span>
            <span className="rd-perf-value">{perfStats.delay}</span>
          </div>
        </div>

        {/* 🖥️ QUICK DISPLAY SWITCHER */}
        {displays.length > 1 && (
          <div className="display-switcher-overlay">
            {displays.map((_, index) => (
              <button
                key={index}
                onClick={async () => {
                  try {
                    await invoke('switch_display', { id, display: index });
                  } catch (e) { console.error("Switch failed:", e); }
                }}
                className={`display-btn ${currentDisplay === index ? 'active' : ''}`}
                title={`切換到顯示器 ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: viewMode === 'original' ? 'none' : '100%',
            maxHeight: viewMode === 'original' ? 'none' : '100%',
            width: viewMode === 'original' ? (lastDimensionsRef.current.width ? `${lastDimensionsRef.current.width}px` : '100%') : '100%',
            height: viewMode === 'original' ? (lastDimensionsRef.current.height ? `${lastDimensionsRef.current.height}px` : '100%') : '100%',
            objectFit: viewMode === 'contain' ? 'contain' : (viewMode === 'cover' ? 'cover' : 'none'),
            cursor: 'none',
            display: decoderRef.current ? 'block' : 'none'
          }}
          onMouseDown={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: true }); }}
          onMouseUp={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: false }); }}
          onMouseMove={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_move', { id, ...c }); }}
          onWheel={e => { const c = getCoords(e); if (c && id) invoke('send_wheel', { id, ...c, delta_x: Math.round(e.deltaX), delta_y: Math.round(e.deltaY) }); }}
          onContextMenu={e => e.preventDefault()}
          tabIndex={0}
          onKeyDown={e => {
            e.preventDefault();
            if (id) invoke('send_key_event', {
              id, key: e.code, pressed: true,
              ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey
            });
          }}
          onKeyUp={e => {
            e.preventDefault();
            if (id) invoke('send_key_event', {
              id, key: e.code, pressed: false,
              ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey
            });
          }}
        />

        {/* 🖱️ 远端光标覆盖层 — 跟随远端光标位置 */}
        <div
          ref={cursorDivRef}
          style={{
            position: 'fixed',
            display: 'none',
            pointerEvents: 'none', // 不拦截鼠标事件
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '0 0',
            zIndex: 999,
            // 初始尺寸，cursor-data 事件会动态更新
            width: '16px',
            height: '16px',
          }}
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
                placeholder={t('Enter Password')}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="rs-modal-footer">
              <button
                className="rs-btn-blue"
                style={{ background: '#F1F3F4', color: '#202124', boxShadow: 'none' }}
                onClick={() => setPasswordReq(null)}
              >
                {t('Cancel')}
              </button>
              <button
                className="rs-btn-blue"
                onClick={() => {
                  const input = document.querySelector('.rs-input-gray') as HTMLInputElement;
                  handlePasswordSubmit(input.value);
                }}
              >
                {t('Login')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
