// index.tsx
import { useState, useRef, useEffect } from 'react';
import { useWebCodecs } from './hooks/useWebCodecs';
import { useInputHandlers } from './hooks/useInputHandlers';
import RemoteToolbar from '../../components/RemoteToolbar';
import PerfMonitor from './components/PerfMonitor';
import PasswordModal from './components/PasswordModal';

export default function SessionModule({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'contain' | 'cover' | 'original'>('contain');
  const [passwordReq, setPasswordReq] = useState<{ id: string, title: string, text: string } | null>(null);
  const [perfStats] = useState({ fps: 60, speed: '2.5 MB/s', delay: '15ms', codec: 'H264' });

  const { initDecoder, detectCodecs, lastDimensionsRef } = useWebCodecs(id, canvasRef);
  const inputHandlers = useInputHandlers(id, canvasRef, lastDimensionsRef.current);

  useEffect(() => {
    detectCodecs();
    // Simulate initial decoder init for demonstration
    initDecoder('H264', 1920, 1080);
  }, [detectCodecs, initDecoder]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden relative">
      <RemoteToolbar 
        id={id} 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
      />
      
      <PerfMonitor stats={perfStats} isHardware={true} />
      
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full shadow-2xl transition-all duration-300"
          style={{ 
            objectFit: viewMode === 'contain' ? 'contain' : 'cover',
            cursor: 'none'
          }}
          {...inputHandlers}
        />
      </div>

      {passwordReq && (
        <PasswordModal 
          title={passwordReq.title} 
          text={passwordReq.text} 
          onSubmit={(p) => console.log('Pwd:', p)}
          onCancel={() => setPasswordReq(null)}
        />
      )}
    </div>
  );
}
