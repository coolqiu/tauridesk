import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Lock, Monitor, Info, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RemoteToolbar from '../components/RemoteToolbar';
import '../index.css';

// Check if WebCodecs is supported at module level
const isWebCodecsSupported = typeof VideoDecoder !== 'undefined' && typeof VideoDecoder.isConfigSupported !== 'undefined';
type QualityMode = 'smooth' | 'balanced' | 'quality';

const readQualityMode = (): QualityMode => {
  const saved = localStorage.getItem('rustdesk-quality-mode');
  return saved === 'smooth' || saved === 'balanced' || saved === 'quality' ? saved : 'balanced';
};

export default function SessionWindow() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [viewMode, setViewMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const codecSupportSentRef = useRef<boolean>(false);
  const [passwordReq, setPasswordReq] = useState<{ id: string, title: string, text: string } | null>(null);
  const [displays, setDisplays] = useState<any[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<number>(0);
  const [showRemoteCursor, setShowRemoteCursor] = useState<boolean>(true);
  const showRemoteCursorRef = useRef(true);
  const viewModeRef = useRef<'contain' | 'cover' | 'original'>('contain');
  const [qualityMode, setQualityMode] = useState<QualityMode>(readQualityMode);
  const [isPerfCollapsed, setIsPerfCollapsed] = useState(true);
  const qualityModeRef = useRef<QualityMode>(qualityMode);
  const [perfStats, setPerfStats] = useState({
    fps: 0,
    recvFps: 0,
    decodeFps: 0,
    renderFps: 0,
    dropFps: 0,
    keyFps: 0,
    speed: '-',
    delay: '-',
    codec: ''
  });
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
  const recvFrameCountRef = useRef(0);
  const keyFrameCountRef = useRef(0);
  const renderFrameCountRef = useRef(0);
  const droppedFrameCountRef = useRef(0);
  const lastRecvFrameCountRef = useRef(0);
  const lastKeyFrameCountRef = useRef(0);
  const lastRenderFrameCountRef = useRef(0);
  const lastKeyFrameRefreshAtRef = useRef(0);
  const statusRef = useRef<string>('Initializing...');
  const lastPtsRef = useRef(BigInt(0));
  const currentCodecRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // 远端光标状态
  const cursorXRef = useRef(0);
  const cursorYRef = useRef(0);
  const cursorDivRef = useRef<HTMLDivElement | null>(null);
  const cursorImageCacheRef = useRef<Map<string, string>>(new Map()); // cursorId -> dataURI
  const currentCursorIdRef = useRef<string>('');

  const updateStatus = (next: string) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatus(next);
  };

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!canvasCtxRef.current) {
      canvasCtxRef.current = canvas.getContext('2d', { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);
    }
    return canvasCtxRef.current;
  };

  useEffect(() => {
    qualityModeRef.current = qualityMode;
    localStorage.setItem('rustdesk-quality-mode', qualityMode);
  }, [qualityMode]);

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
      // VP9 currently falls back to software in WebView and gradually builds
      // latency on high-motion desktops. Keep it out of the default Tauri path.
      const vp9Supported = false;

      let h264Supported = false;
      for (const variation of ['avc1.42001f', 'avc1.4D001F', 'avc1.64001F', 'h264']) {
        if (await testCodec(variation)) { h264Supported = true; break; }
      }

      let h265Supported = false;
      for (const variation of ['hev1.1.6.L123.B0', 'hev1.1.6.L120.B0', 'hvc1.1.6.L123.B0', 'hvc1.1.6.L120.B0', 'h265', 'hevc']) {
        if (await testCodec(variation)) { h265Supported = true; break; }
      }

      // AV1 can be supported by WebCodecs but still be a poor default for
      // interactive remote control. Prefer H264/VPx until codec preference UI
      // exists, otherwise video-heavy desktops can negotiate AV1 and crawl.
      const av1Supported = false;

      // VP8 is last priority
      let vp8Supported = false;
      for (const variation of ['vp08.00.10.08', 'vp08.01.10.08', 'vp8']) {
        if (await testCodec(variation)) { vp8Supported = true; break; }
      }

      isWebCodecsSupportedRef.current = vp8Supported || vp9Supported || h264Supported || h265Supported || av1Supported;

      if (!isWebCodecsSupportedRef.current) {
        console.warn('⚠️ [WebCodecs] No hardware acceleration supported, falling back to legacy.');
        updateStatus('WebCodecs Not Supported');
        return;
      }

      if (id && !codecSupportSentRef.current) {
        codecSupportSentRef.current = true;

        invoke('set_browser_supported_codecs', {
          vp8: vp8Supported,
          vp9: vp9Supported,
          h264: h264Supported,
          h265: h265Supported,
          av1: av1Supported
        }).catch(err => console.error("❌ Failed to send codec support to Rust:", err));
      }
    };

    detectAndSendCodecSupport();

    const CODEC_MAP: Record<number, string> = { 0: 'VP8', 1: 'VP9', 2: 'H264', 3: 'H265', 4: 'AV1' };
    const videoChannel = new Channel<any>();

    const autoCloseOnFrame = () => {
      if (passwordReq) {
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

        const codecVariations: string[] = [];
        const normalizedFormat = format.toUpperCase();
        switch (normalizedFormat) {
          case 'VP8': codecVariations.push('vp8', 'vp08.00.10.08'); break;
          case 'VP9': codecVariations.push('vp9', 'vp09.00.10.08'); break;
          case 'H264': codecVariations.push('avc1.42001f', 'avc1.4D001F', 'avc1.64001F', 'h264'); break;
          case 'H265': codecVariations.push('hev1.1.6.L123.B0', 'hev1.1.6.L120.B0', 'hvc1.1.6.L123.B0', 'hvc1.1.6.L120.B0', 'h265', 'hevc'); break;
          case 'AV1': codecVariations.push('av1', 'av01.0.08M.08'); break;
        }

        let foundConfig: any = null;
        for (const c of codecVariations) {
          const config: VideoDecoderConfig = {
            codec: c,
            codedWidth: width,
            codedHeight: height,
            hardwareAcceleration: c.startsWith('vp') ? 'prefer-software' : 'prefer-hardware',
            optimizeForLatency: true,
          };

          if (normalizedFormat === 'H264') {
            Object.assign(config, { avc: { format: 'annexb' } });
          } else if (normalizedFormat === 'H265') {
            Object.assign(config, { hevc: { format: 'annexb' } });
          }
          
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
            const canvas = canvasRef.current;
            if (!canvas) {
              if (frameCount % 60 === 1) console.warn('⚠️ [WebCodecs] Output received but canvas is null');
              frame.close();
              return;
            }
            const ctx = getCanvasContext();
            if (!ctx) {
              frame.close();
              return;
            }

            if (frame.displayWidth !== canvas.width || frame.displayHeight !== canvas.height) {
              canvas.width = frame.displayWidth;
              canvas.height = frame.displayHeight;
              canvasCtxRef.current = null;
            }

            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
            frame.close();
            renderFrameCountRef.current++;
            autoCloseOnFrame();
            
            // WebCodecs standard doesn't officially expose `.acceleration` on VideoDecoder synchronously across all browsers yet.
            // We use the requested acceleration strategy to reliably report intended hardware mode.
            const reqMode = (decoderRef.current as any)?._requestedAcceleration || 'prefer-software';
            const modeStr = reqMode === 'prefer-hardware' ? '[GPU]' : '[CPU]';
            updateStatus(`WebCodecs ${modeStr}`);
          },
          error: (e: any) => {
            const hex = Array.from(lastChunkRef.current?.subarray(0, 16) || [])
              .map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.error(`❌ WebCodecs 拒绝解码！原因: ${e.message} | 数据指纹: ${hex}`);
            updateStatus(`WebCodecs Error: ${e.message}`);

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
      } catch (err) {
        console.error('❌ [WebCodecs] Initialization failed:', err);
      } finally {
        isInitializingRef.current = false;
      }
    };

    const handleLegacyRgba = (pixelBytes: Uint8ClampedArray, w: number, h: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = getCanvasContext();
      if (!ctx) return;

      if (w !== canvas.width || h !== canvas.height) {
        canvas.width = w;
        canvas.height = h;
        canvasCtxRef.current = null;
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
      renderFrameCountRef.current++;
      autoCloseOnFrame();
      updateStatus('Software Rendering');
    };

    const hasAnnexBKeyFrame = (bytes: Uint8Array, format: string) => {
      const keyNalTypes = format === 'H265' ? new Set([19, 20, 21]) : new Set([5]);
      for (let i = 0; i + 5 < bytes.length; i++) {
        let start = -1;
        if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 1) start = i + 3;
        else if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 0 && bytes[i + 3] === 1) start = i + 4;
        if (start < 0 || start >= bytes.length) continue;
        const nalType = format === 'H265' ? ((bytes[start] & 0x7E) >> 1) : (bytes[start] & 0x1F);
        if (keyNalTypes.has(nalType)) return true;
      }
      return false;
    };

    videoChannel.onmessage = async (rawPayload: any) => {
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
      recvFrameCountRef.current++;

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
      } else if ((codec === 'H264' || codec === 'H265') && !isActuallyKey) {
        isActuallyKey = hasAnnexBKeyFrame(data, codec);
      }

      // If we need a key frame but this isn't one, skip it
      if (needsKeyFrameRef.current && !isActuallyKey) {
        const now = Date.now();
        if (id && now - lastKeyFrameRefreshAtRef.current > 500) {
          lastKeyFrameRefreshAtRef.current = now;
          invoke('refresh_video', { id }).catch(() => { });
        }
        return;
      }

      if (isActuallyKey) keyFrameCountRef.current++;

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
        isInitializingRef.current = true;
        if (decoderRef.current) {
          try { decoderRef.current.close(); } catch { }
          decoderRef.current = null;
        }
        await initWebCodecs(codec, curW, curH);
      }

      if (isInitializingRef.current || !decoderRef.current) return;

      if (isActuallyKey) needsKeyFrameRef.current = false;

      // Save last chunk for error debugging
      lastChunkRef.current = data.subarray(0, Math.min(data.length, 64));

      // DECODE
      const activeDecoder = decoderRef.current;
      if (activeDecoder && activeDecoder.state === 'configured') {
        try {
          const queueSize = activeDecoder.decodeQueueSize;
          const mode = qualityModeRef.current;
          const softQueueLimit = mode === 'smooth' ? 1 : mode === 'quality' ? 4 : 2;
          const hardQueueLimit = mode === 'smooth' ? 4 : mode === 'quality' ? 12 : 8;
          if (queueSize > softQueueLimit && !isActuallyKey) {
            droppedFrameCountRef.current++;
            return;
          }
          if (queueSize > hardQueueLimit) {
            droppedFrameCountRef.current++;
            needsKeyFrameRef.current = true;
            invoke('refresh_video', { id }).catch(() => { });
            return;
          }
          activeDecoder.decode(new EncodedVideoChunk({
            type: isActuallyKey ? 'key' : 'delta',
            timestamp: Number(timestamp) * 1000,
            data
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
        .then(() => invoke('refresh_video', { id }))
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
      setDisplays(event.payload);
    });

    const unlistenCurrentDisplay = listen('current-display-changed', (event: any) => {
      const newIdx = event.payload;
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
      const currentRecvCount = recvFrameCountRef.current;
      const currentKeyCount = keyFrameCountRef.current;
      const currentRenderCount = renderFrameCountRef.current;
      const decodeFps = currentCount - lastLoggedFrameCountRef.current;
      const recvFps = currentRecvCount - lastRecvFrameCountRef.current;
      const keyFps = currentKeyCount - lastKeyFrameCountRef.current;
      const renderFps = currentRenderCount - lastRenderFrameCountRef.current;
      const dropFps = droppedFrameCountRef.current;
      lastLoggedFrameCountRef.current = currentCount;
      lastRecvFrameCountRef.current = currentRecvCount;
      lastKeyFrameCountRef.current = currentKeyCount;
      lastRenderFrameCountRef.current = currentRenderCount;
      setPerfStats(prev => ({
        ...prev,
        fps: renderFps,
        recvFps,
        decodeFps,
        renderFps,
        dropFps,
        keyFps,
        codec: currentCodecRef.current || 'None'
      }));
      droppedFrameCountRef.current = 0;
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
      canvasCtxRef.current = null;
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
          onShowQualityPanel={() => setIsPerfCollapsed(false)}
          onRemoteOptionChange={(key, value) => {
            setRemoteOptions(prev => ({ ...prev, [key]: value }));
          }}
        />

        {/* 📈 REAL-TIME TRAJECTORY MONITOR */}
        {!isPerfCollapsed && (
          <div className="rd-perf-monitor">
            <div className="rd-perf-header">
              <span><Activity size={12} /> {t('Session Quality')}</span>
              <button
                className="rd-perf-toggle"
                onClick={() => setIsPerfCollapsed(true)}
                title={t('Collapse')}
              >
                x
              </button>
            </div>
            <div className="rd-quality-modes">
              <button
                className={qualityMode === 'smooth' ? 'active' : ''}
                onClick={() => setQualityMode('smooth')}
                title={t('Prefer smoothness')}
              >
                {t('Smooth')}
              </button>
              <button
                className={qualityMode === 'balanced' ? 'active' : ''}
                onClick={() => setQualityMode('balanced')}
                title={t('Balanced')}
              >
                {t('Balance')}
              </button>
              <button
                className={qualityMode === 'quality' ? 'active' : ''}
                onClick={() => setQualityMode('quality')}
                title={t('Prefer quality')}
              >
                {t('Quality')}
              </button>
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
              <span className="rd-perf-label">{t('In/Dec')}:</span>
              <span className="rd-perf-value">{perfStats.recvFps}/{perfStats.decodeFps} K:{perfStats.keyFps}</span>
            </div>
            <div className="rd-perf-row">
              <span className="rd-perf-label">{t('Render/Drop')}:</span>
              <span className="rd-perf-value">{perfStats.renderFps}/{perfStats.dropFps}</span>
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
        )}

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
          onMouseDown={e => { canvasRef.current?.focus(); const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: true }); }}
          onMouseUp={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_event', { id, ...c, button: e.button, pressed: false }); }}
          onMouseMove={e => { const c = getCoords(e); if (c && id) invoke('send_mouse_move', { id, ...c }); }}
          onWheel={e => { const c = getCoords(e); if (c && id) invoke('send_wheel', { id, ...c, deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) }); }}
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
