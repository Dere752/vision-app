export interface BoundingBox {
  x: number;      // center x, normalized 0-1
  y: number;      // center y, normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
}

export interface Detection {
  bbox: BoundingBox;
  classId: number;
  className: string;
  confidence: number;
  color: string;
}

export type TrackState = 'tentative' | 'confirmed' | 'lost';

export interface Track {
  id: number;
  bbox: BoundingBox;
  smoothBbox: BoundingBox;
  classId: number;
  className: string;
  confidence: number;
  color: string;
  state: TrackState;
  age: number;
  hits: number;
  timeSinceUpdate: number;
  opacity: number; // for fade in/out animation
}

export interface AppSettings {
  confidenceThreshold: number;
  iouThreshold: number;
  maxDetections: number;
  trackingEnabled: boolean;
  smoothingFactor: number;
  fpsLimit: number;
  showLabels: boolean;
  showConfidence: boolean;
  showIds: boolean;
  labelSize: number;
  boxOpacity: number;
  showScanLines: boolean;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface Stats {
  fps: number;
  inferenceTime: number;
  trackCount: number;
  detectionCount: number;
  resolution: { width: number; height: number };
  backend: string;
  cpuUsage: number;
}

export type ModelStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface ModelInfo {
  name: string;
  url: string;
  inputSize: number;
  description: string;
  sizeMB: number;
}

export interface LetterboxParams {
  scale: number;
  padX: number;
  padY: number;
  origW: number;
  origH: number;
}
