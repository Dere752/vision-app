import type { AppSettings, ModelInfo } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  confidenceThreshold: 0.40,
  iouThreshold: 0.45,
  maxDetections: 100,
  trackingEnabled: true,
  smoothingFactor: 0.30,
  fpsLimit: 30,
  showLabels: true,
  showConfidence: true,
  showIds: true,
  labelSize: 13,
  boxOpacity: 0.18,
  showScanLines: false,
};

export const MODELS: ModelInfo[] = [
  {
    name: 'YOLOv8n',
    // Loaded from local public/models/ — run "npm run download-model" first
    url: '/models/yolov8n.onnx',
    inputSize: 640,
    description: 'Nano — fastest, ~6 MB',
    sizeMB: 6.3,
  },
  {
    name: 'YOLOv8s',
    url: '/models/yolov8s.onnx',
    inputSize: 640,
    description: 'Small — balanced, ~22 MB',
    sizeMB: 22.4,
  },
];

export const MODEL_INPUT_SIZE = 640;
export const MODEL_NUM_CLASSES = 80;
export const MODEL_NUM_ANCHORS = 8400;

export const TRACKER_MAX_AGE = 8;      // frames before track is deleted
export const TRACKER_MIN_HITS = 2;     // frames before track is confirmed
export const TRACKER_IOU_THRESHOLD = 0.25;
export const TRACKER_SMOOTH_ALPHA = 0.35;
