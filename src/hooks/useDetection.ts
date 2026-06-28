import { useState, useRef, useCallback, useEffect } from 'react';
import { detectionService } from '../services/detection.service';
import { trackingService } from '../services/tracking.service';
import { useAnimationFrame } from './useAnimationFrame';
import { useStats } from './useStats';
import type { AppSettings, ModelInfo, ModelStatus, Stats, Track } from '../types';

interface UseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  settings: AppSettings;
  modelInfo: ModelInfo;
}

export function useDetection({ videoRef, settings, modelInfo }: UseDetectionProps) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<Stats>({
    fps: 0, inferenceTime: 0, trackCount: 0,
    detectionCount: 0, resolution: { width: 0, height: 0 }, backend: '—', cpuUsage: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const frameSkip = useRef(0);
  const { update: updateStats } = useStats();

  const loadModel = useCallback(async () => {
    setModelStatus('downloading');
    setDownloadProgress(0);
    try {
      await detectionService.loadModel(modelInfo.url, pct => setDownloadProgress(pct));
      setModelStatus('ready');
      setIsRunning(true);
    } catch (e) {
      console.error('Model load failed:', e);
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setModelStatus('error');
    }
  }, [modelInfo.url]);

  const loadModelFromFile = useCallback(async (file: File) => {
    setModelStatus('loading');
    setErrorMessage('');
    try {
      const buffer = await file.arrayBuffer();
      await detectionService.loadModelFromBuffer(buffer);
      setModelStatus('ready');
      setIsRunning(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setModelStatus('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await loadModel();
    };
    run();
    return () => {
      cancelled = true;
      detectionService.dispose();
      trackingService.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelInfo.url]);

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !detectionService.isReady) return;

    // Skip frames for FPS limiting — inference runs at half display rate
    frameSkip.current++;
    if (frameSkip.current % 2 !== 0) return;

    const { detections, inferenceMs } = await detectionService.detect(
      video,
      settings.confidenceThreshold,
      settings.iouThreshold
    );

    const updatedTracks = settings.trackingEnabled
      ? trackingService.update(detections)
      : detections.map((d, i) => ({
          id: i, bbox: d.bbox, smoothBbox: d.bbox,
          classId: d.classId, className: d.className,
          confidence: d.confidence, color: d.color,
          state: 'confirmed' as const, age: 1, hits: 1, timeSinceUpdate: 0, opacity: 1,
        }));

    const resolution = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    const newStats = updateStats({
      inferenceMs,
      trackCount: updatedTracks.filter(t => t.state === 'confirmed').length,
      detectionCount: detections.length,
      resolution,
      backend: detectionService.backend,
    });

    setTracks(updatedTracks);
    setStats(newStats);
  }, [videoRef, settings, updateStats]);

  useAnimationFrame(processFrame, isRunning && modelStatus === 'ready', settings.fpsLimit);

  const toggleRunning = useCallback(() => setIsRunning(p => !p), []);

  return {
    modelStatus, downloadProgress, errorMessage,
    tracks, stats, isRunning,
    toggleRunning, retryLoad: loadModel, loadModelFromFile,
  };
}
