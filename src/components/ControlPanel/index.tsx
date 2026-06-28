import React, { memo } from 'react';
import type { CameraDevice } from '../../types';

interface ControlPanelProps {
  isRunning: boolean;
  onToggle: () => void;
  cameras: CameraDevice[];
  selectedId: string | null;
  onSelectCamera: (id: string) => void;
  onOpenSettings: () => void;
  isConnected: boolean;
}

function IconButton({
  onClick, title, active, children,
}: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-white/15 text-white'
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

export const ControlPanel = memo(function ControlPanel({
  isRunning, onToggle, cameras, selectedId, onSelectCamera, onOpenSettings, isConnected,
}: ControlPanelProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10"
        style={{
          background: 'rgba(10,10,20,0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Camera indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-white/40 text-xs hidden sm:block">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Play/Pause */}
        <button
          onClick={onToggle}
          className={`w-11 h-11 rounded-xl flex items-center justify-center font-medium text-sm transition-all duration-200 cursor-pointer ${
            isRunning
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white/10 hover:bg-white/15 text-white/70'
          }`}
          title={isRunning ? 'Pause detection' : 'Resume detection'}
        >
          {isRunning ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="w-px h-6 bg-white/10" />

        {/* Camera selector */}
        {cameras.length > 1 && (
          <>
            <div className="relative">
              <select
                value={selectedId ?? ''}
                onChange={e => onSelectCamera(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-white/70 text-xs rounded-xl px-3 py-2 pr-7 cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                style={{ minWidth: 120, maxWidth: 160 }}
              >
                {cameras.map(cam => (
                  <option key={cam.deviceId} value={cam.deviceId} style={{ background: '#0a0a0f' }}>
                    {cam.label.length > 22 ? cam.label.slice(0, 22) + '…' : cam.label}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="w-px h-6 bg-white/10" />
          </>
        )}

        {/* Settings */}
        <IconButton onClick={onOpenSettings} title="Settings">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
});
