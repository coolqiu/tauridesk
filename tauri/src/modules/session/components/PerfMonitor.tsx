// components/PerfMonitor.tsx
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PerfStats {
  fps: number;
  speed: string;
  delay: string;
  codec: string;
}

export default function PerfMonitor({ stats, isHardware }: { stats: PerfStats, isHardware: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rd-perf-monitor absolute top-20 right-4 p-3 bg-black/80 border border-[#333] rounded-lg text-xs z-50">
      <div className="flex items-center gap-2 mb-2 text-[var(--rd-accent)] font-bold">
        <Activity size={12} /> {t('Session Quality')}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted">{t('Path')}:</span>
          <span className={isHardware ? 'text-green-400' : 'text-amber-400'}>{isHardware ? 'HARDWARE+' : 'SOFTWARE'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">{t('Codec')}:</span>
          <span className="text-secondary">{stats.codec}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">{t('FPS')}:</span>
          <span className="text-white font-mono">{stats.fps} FPS</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">{t('Speed')}:</span>
          <span className="text-secondary">{stats.speed}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">{t('Delay')}:</span>
          <span className="text-secondary">{stats.delay}</span>
        </div>
      </div>
    </div>
  );
}
