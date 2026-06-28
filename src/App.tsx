import React, { useRef, useState, useCallback } from 'react';
import { DetectionCanvas } from './components/DetectionCanvas';
import { InfoPanel } from './components/InfoPanel';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { useCamera } from './hooks/useCamera';
import { useDetection } from './hooks/useDetection';
import { DEFAULT_SETTINGS, MODELS } from './config/app';
import type { AppSettings, ModelInfo } from './types';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [modelInfo, setModelInfo] = useState<ModelInfo>(MODELS[0]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    devices, selectedId, selectCamera, isConnected, error: cameraError,
  } = useCamera(videoRef);

  const {
    modelStatus, downloadProgress, errorMessage, tracks, stats,
    isRunning, toggleRunning, retryLoad, loadModelFromFile,
  } = useDetection({ videoRef, settings, modelInfo });

  const handleModelChange = useCallback((m: ModelInfo) => {
    setModelInfo(m);
    setIsSettingsOpen(false);
  }, []);

  const showOverlay = modelStatus !== 'ready';

  return (
    <div className="relative w-full h-full bg-space-950 overflow-hidden select-none">
      {/* Camera feed */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
      />

      {/* Dark vignette overlay */}
      <div className="vignette-overlay" />

      {/* Detection canvas overlay */}
      {!showOverlay && (
        <DetectionCanvas
          videoRef={videoRef}
          tracks={tracks}
          settings={settings}
          isRunning={isRunning}
        />
      )}

      {/* Loading / error screen */}
      {showOverlay && (
        <LoadingScreen
          status={modelStatus}
          progress={downloadProgress}
          onRetry={retryLoad}
          onModelFile={loadModelFromFile}
          modelName={modelInfo.name}
          errorMessage={errorMessage}
        />
      )}

      {/* UI panels (only when model is ready) */}
      {!showOverlay && (
        <>
          <InfoPanel stats={stats} />

          {/* Camera error badge */}
          {cameraError && (
            <div className="absolute top-4 left-4 z-20 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs animate-fade-in">
              {cameraError}
            </div>
          )}

          <ControlPanel
            isRunning={isRunning}
            onToggle={toggleRunning}
            cameras={devices}
            selectedId={selectedId}
            onSelectCamera={selectCamera}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isConnected={isConnected}
          />

          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onChange={setSettings}
            currentModel={modelInfo}
            onChangeModel={handleModelChange}
          />
        </>
      )}
    </div>
  );
}
