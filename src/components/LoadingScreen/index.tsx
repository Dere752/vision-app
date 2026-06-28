import React, { useCallback, useRef, useState } from 'react';
import type { ModelStatus } from '../../types';

interface LoadingScreenProps {
  status: ModelStatus;
  progress: number;
  onRetry: () => void;
  onModelFile: (file: File) => void;
  modelName: string;
  errorMessage?: string;
}

export function LoadingScreen({
  status, progress, onRetry, onModelFile, modelName, errorMessage,
}: LoadingScreenProps) {
  const pct = Math.round(progress * 100);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file.name.endsWith('.onnx')) onModelFile(file);
  }, [onModelFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-space-900">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#007AFF 1px, transparent 1px), linear-gradient(90deg, #007AFF 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative flex flex-col items-center gap-7 px-8 max-w-sm w-full">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          {(status === 'loading' || status === 'downloading') && (
            <div className="absolute -inset-1 rounded-[28px] border-2 border-blue-500/40 animate-ping" />
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Vision AI</h1>
          <p className="text-sm text-white/40 mt-1">Real-Time Object Detection</p>
        </div>

        {status === 'idle' && (
          <p className="text-white/50 text-sm">Initializing…</p>
        )}

        {(status === 'downloading' || status === 'loading') && (
          <div className="w-full space-y-3">
            <div className="flex justify-between text-xs text-white/50">
              <span>{status === 'downloading' ? `Loading ${modelName}` : 'Compiling shaders…'}</span>
              {status === 'downloading' && pct > 0 && <span>{pct}%</span>}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                style={{ width: status === 'loading' ? '100%' : `${Math.max(pct, 4)}%` }}
              />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full space-y-4">
            {/* Error box */}
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-red-400 text-sm font-medium">Model not found</p>
              <p className="text-red-400/60 text-xs mt-1">
                {errorMessage?.includes('not found')
                  ? 'Run "npm run download-model" or drop the .onnx file below.'
                  : 'Check your connection or drop the .onnx file below.'}
              </p>
            </div>

            {/* Drag & drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`w-full py-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-white/15 hover:border-white/30 hover:bg-white/4'
              }`}
            >
              <svg className="w-8 h-8 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-white/40 text-sm">Drop <span className="text-white/60 font-medium">yolov8n.onnx</span> here</p>
              <p className="text-white/25 text-xs">or click to browse</p>
              <input
                ref={inputRef}
                type="file"
                accept=".onnx"
                aria-label="Select ONNX model file"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Retry */}
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Retry
            </button>

            {/* Instructions */}
            <div className="text-white/25 text-xs space-y-2">
              <p className="font-medium text-white/35">Download model:</p>
              <code className="block bg-white/5 px-3 py-2 rounded-xl text-[11px] text-white/45 leading-relaxed">
                cd vision-app{'\n'}
                npm run download-model
              </code>
              <p className="text-white/20">Then refresh. Model is ~6 MB.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
