import React, { memo } from 'react';
import type { Stats } from '../../types';

interface InfoPanelProps {
  stats: Stats;
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-mono font-semibold ${accent ? 'text-green-400' : 'text-white/80'}`}>
        {value}
      </span>
    </div>
  );
}

function FpsRing({ fps }: { fps: number }) {
  const max = 60;
  const pct = Math.min(fps / max, 1);
  const size = 52;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = fps >= 50 ? '#30D158' : fps >= 25 ? '#FF9F0A' : '#FF453A';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: -38 }}>
        <span className="text-white text-sm font-bold leading-none" style={{ color }}>{fps}</span>
        <span className="text-white/30 text-[9px] leading-none mt-0.5">FPS</span>
      </div>
    </div>
  );
}

export const InfoPanel = memo(function InfoPanel({ stats }: InfoPanelProps) {
  const { fps, inferenceTime, trackCount, detectionCount, resolution, backend } = stats;

  return (
    <div
      className="absolute top-4 right-4 z-20 animate-slide-up"
      style={{ minWidth: 200 }}
    >
      <div
        className="rounded-2xl border border-white/10 p-4 space-y-3"
        style={{
          background: 'rgba(10,10,20,0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* FPS ring + header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <FpsRing fps={fps} />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-none">Vision AI</div>
            <div className="text-white/30 text-xs mt-1 leading-none">
              {backend.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 pt-3 space-y-2">
          <StatRow label="Latency" value={`${inferenceTime} ms`} />
          <StatRow label="Objects" value={trackCount} accent={trackCount > 0} />
          <StatRow label="Detections" value={detectionCount} />
          <StatRow
            label="Resolution"
            value={resolution.width > 0 ? `${resolution.width}×${resolution.height}` : '—'}
          />
        </div>

        {/* Object count badges */}
        {trackCount > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Array.from({ length: Math.min(trackCount, 6) }, (_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-400/70" />
            ))}
            {trackCount > 6 && (
              <span className="text-green-400/50 text-[10px]">+{trackCount - 6}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
