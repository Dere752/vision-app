import { useState, useEffect, useRef, useCallback } from 'react';
import { cameraService } from '../services/camera.service';
import type { CameraDevice } from '../types';

export function useCamera(videoRef: React.RefObject<HTMLVideoElement>) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadDevices = useCallback(async () => {
    try {
      const devs = await cameraService.getDevices();
      if (!mountedRef.current) return;
      setDevices(devs);
      if (devs.length > 0 && !selectedId) {
        setSelectedId(devs[0].deviceId);
      }
    } catch (e) {
      setError('Could not enumerate cameras');
    }
  }, [selectedId]);

  const startCamera = useCallback(async (deviceId: string | null) => {
    setError(null);
    setIsConnected(false);
    try {
      const stream = await cameraService.start(deviceId, 1280, 720, () => {
        if (mountedRef.current) setIsConnected(false);
      });
      if (!mountedRef.current) { cameraService.stop(); return; }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsConnected(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Camera access denied');
    }
  }, [videoRef]);

  useEffect(() => {
    loadDevices();
    return () => cameraService.stop();
  }, []);

  useEffect(() => {
    if (selectedId !== null) startCamera(selectedId);
  }, [selectedId]);

  const selectCamera = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return { devices, selectedId, selectCamera, isConnected, error };
}
