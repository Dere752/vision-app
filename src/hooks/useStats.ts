import { useRef, useCallback } from 'react';
import { ScalarSmoother } from '../utils/smoothing';
import type { Stats } from '../types';

export function useStats() {
  const fpsSmoother = useRef(new ScalarSmoother(0.15));
  const latencySmoother = useRef(new ScalarSmoother(0.2));
  const lastFrameTime = useRef(performance.now());
  const statsRef = useRef<Stats>({
    fps: 0,
    inferenceTime: 0,
    trackCount: 0,
    detectionCount: 0,
    resolution: { width: 0, height: 0 },
    backend: '—',
    cpuUsage: 0,
  });

  const update = useCallback((params: {
    inferenceMs: number;
    trackCount: number;
    detectionCount: number;
    resolution: { width: number; height: number };
    backend: string;
  }) => {
    const now = performance.now();
    const delta = now - lastFrameTime.current;
    lastFrameTime.current = now;

    const rawFps = delta > 0 ? 1000 / delta : 0;
    const fps = fpsSmoother.current.update(rawFps);
    const inferenceTime = latencySmoother.current.update(params.inferenceMs);

    statsRef.current = {
      fps: Math.round(fps),
      inferenceTime: Math.round(inferenceTime),
      trackCount: params.trackCount,
      detectionCount: params.detectionCount,
      resolution: params.resolution,
      backend: params.backend,
      cpuUsage: 0,
    };

    return statsRef.current;
  }, []);

  return { statsRef, update };
}
