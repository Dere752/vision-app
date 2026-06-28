import React, { useEffect, useRef, useCallback } from 'react';
import type { Track, AppSettings } from '../../types';
import { renderFrame } from './renderer';
import { useAnimationFrame } from '../../hooks/useAnimationFrame';

interface DetectionCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  tracks: Track[];
  settings: AppSettings;
  isRunning: boolean;
}

export const DetectionCanvas = React.memo(function DetectionCanvas({
  videoRef,
  tracks,
  settings,
  isRunning,
}: DetectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || video.offsetWidth;
    canvas.height = video.videoHeight || video.offsetHeight;
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('loadedmetadata', resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => {
      video.removeEventListener('loadedmetadata', resizeCanvas);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderFrame(ctx, tracksRef.current, settings, canvas.width, canvas.height);
  }, [settings]);

  useAnimationFrame(draw, isRunning, 60);

  // Also draw when not running (so tracks fade out)
  useEffect(() => {
    if (!isRunning) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isRunning]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
});
