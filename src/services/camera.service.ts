import type { CameraDevice } from '../types';

export class CameraService {
  private stream: MediaStream | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onDisconnect?: () => void;

  async getDevices(): Promise<CameraDevice[]> {
    await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
      }));
  }

  async start(
    deviceId: string | null,
    width = 1280,
    height = 720,
    onDisconnect?: () => void
  ): Promise<MediaStream> {
    this.stop();
    this.onDisconnect = onDisconnect;

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: 60 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream = stream;

    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      this.scheduleReconnect(deviceId);
      onDisconnect?.();
    });

    return stream;
  }

  stop(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private scheduleReconnect(deviceId: string | null): void {
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.start(deviceId, 1280, 720, this.onDisconnect);
      } catch {
        this.scheduleReconnect(deviceId);
      }
    }, 2000);
  }

  get activeStream(): MediaStream | null {
    return this.stream;
  }

  getResolution(): { width: number; height: number } {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return { width: 0, height: 0 };
    const settings = track.getSettings();
    return { width: settings.width ?? 0, height: settings.height ?? 0 };
  }
}

export const cameraService = new CameraService();
