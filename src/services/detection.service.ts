import * as ort from 'onnxruntime-web';
import type { Detection, LetterboxParams } from '../types';
import { COCO_LABELS } from '../config/labels';
import { CLASS_COLORS } from '../config/colors';
import { MODEL_INPUT_SIZE, MODEL_NUM_ANCHORS, MODEL_NUM_CLASSES } from '../config/app';
import { applyNMS } from '../utils/nms';

// Point ONNX Runtime to CDN for WASM files
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';

const DB_NAME = 'vision-app-models';
const DB_VERSION = 1;
const STORE_NAME = 'models';

async function openModelDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedModel(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openModelDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

async function cacheModel(key: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openModelDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(data, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* non-critical */ }
}

export class DetectionService {
  private session: ort.InferenceSession | null = null;
  private preprocessCanvas: HTMLCanvasElement;
  private preprocessCtx: CanvasRenderingContext2D;
  private letterbox: LetterboxParams = { scale: 1, padX: 0, padY: 0, origW: 0, origH: 0 };
  backend = 'unknown';

  constructor() {
    this.preprocessCanvas = document.createElement('canvas');
    this.preprocessCanvas.width = MODEL_INPUT_SIZE;
    this.preprocessCanvas.height = MODEL_INPUT_SIZE;
    this.preprocessCtx = this.preprocessCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  async loadModel(
    url: string,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    const cacheKey = url.split('/').pop() ?? url;
    let modelData = await getCachedModel(cacheKey);

    if (!modelData) {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404 && url.startsWith('/')) {
          throw new Error(
            `Model file not found at ${url}.\n` +
            `Run "npm run download-model" in the vision-app directory to download it.`
          );
        }
        throw new Error(`Failed to fetch model: ${res.status}`);
      }
      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body!.getReader();
      const chunks: ArrayBuffer[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
        received += value.length;
        if (total > 0) onProgress?.(received / total);
      }

      modelData = await new Blob(chunks).arrayBuffer();
      onProgress?.(1);
      cacheModel(cacheKey, modelData);
    } else {
      onProgress?.(1);
    }

    // Try GPU backends first, then fallback to WASM
    const backends: ort.InferenceSession.ExecutionProviderConfig[] = [
      'webgpu', 'webgl', 'wasm',
    ];

    for (const ep of backends) {
      try {
        this.session = await ort.InferenceSession.create(modelData, {
          executionProviders: [ep],
          graphOptimizationLevel: 'all',
        });
        this.backend = String(ep);
        break;
      } catch { /* try next */ }
    }

    if (!this.session) throw new Error('No execution backend available');
  }

  private preprocess(video: HTMLVideoElement): ort.Tensor {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(MODEL_INPUT_SIZE / vw, MODEL_INPUT_SIZE / vh);
    const nw = Math.round(vw * scale);
    const nh = Math.round(vh * scale);
    const padX = (MODEL_INPUT_SIZE - nw) / 2;
    const padY = (MODEL_INPUT_SIZE - nh) / 2;

    this.letterbox = { scale, padX, padY, origW: vw, origH: vh };

    this.preprocessCtx.fillStyle = '#000';
    this.preprocessCtx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    this.preprocessCtx.drawImage(video, padX, padY, nw, nh);

    const { data } = this.preprocessCtx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    const n = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
    const float32 = new Float32Array(3 * n);

    for (let i = 0; i < n; i++) {
      float32[i]         = data[i * 4]     / 255; // R
      float32[n + i]     = data[i * 4 + 1] / 255; // G
      float32[2 * n + i] = data[i * 4 + 2] / 255; // B
    }

    return new ort.Tensor('float32', float32, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
  }

  private postprocess(
    output: ort.Tensor,
    confidenceThreshold: number,
    iouThreshold: number
  ): Detection[] {
    // output shape: [1, 84, 8400] — transposed YOLOv8 format
    const data = output.data as Float32Array;
    const { scale, padX, padY, origW, origH } = this.letterbox;
    const detections: Detection[] = [];

    for (let i = 0; i < MODEL_NUM_ANCHORS; i++) {
      // Find max class score first (early exit if below threshold)
      let maxScore = 0;
      let classId = 0;
      for (let c = 0; c < MODEL_NUM_CLASSES; c++) {
        const score = data[(4 + c) * MODEL_NUM_ANCHORS + i];
        if (score > maxScore) { maxScore = score; classId = c; }
      }
      if (maxScore < confidenceThreshold) continue;

      // Box coords in model input space (640x640)
      const cx = data[0 * MODEL_NUM_ANCHORS + i];
      const cy = data[1 * MODEL_NUM_ANCHORS + i];
      const bw = data[2 * MODEL_NUM_ANCHORS + i];
      const bh = data[3 * MODEL_NUM_ANCHORS + i];

      // Convert from model space → original image space → normalized
      const origCx = (cx - padX) / scale;
      const origCy = (cy - padY) / scale;
      const origW2 = bw / scale;
      const origH2 = bh / scale;

      detections.push({
        bbox: {
          x: origCx / origW,
          y: origCy / origH,
          width: origW2 / origW,
          height: origH2 / origH,
        },
        classId,
        className: COCO_LABELS[classId],
        confidence: maxScore,
        color: CLASS_COLORS[classId].hex,
      });
    }

    return applyNMS(detections, iouThreshold);
  }

  async loadModelFromBuffer(buffer: ArrayBuffer): Promise<void> {
    const backends: ort.InferenceSession.ExecutionProviderConfig[] = ['webgpu', 'webgl', 'wasm'];
    for (const ep of backends) {
      try {
        this.session = await ort.InferenceSession.create(buffer, {
          executionProviders: [ep],
          graphOptimizationLevel: 'all',
        });
        this.backend = String(ep);
        return;
      } catch { /* try next */ }
    }
    throw new Error('No execution backend available');
  }

  async detect(
    video: HTMLVideoElement,
    confidenceThreshold: number,
    iouThreshold: number
  ): Promise<{ detections: Detection[]; inferenceMs: number }> {
    if (!this.session || video.readyState < 2) return { detections: [], inferenceMs: 0 };

    const tensor = this.preprocess(video);
    const inputName = this.session.inputNames[0];
    const t0 = performance.now();
    const results = await this.session.run({ [inputName]: tensor });
    const inferenceMs = performance.now() - t0;

    const outputTensor = results[this.session.outputNames[0]];
    const detections = this.postprocess(outputTensor, confidenceThreshold, iouThreshold);

    tensor.dispose();
    outputTensor.dispose();

    return { detections, inferenceMs };
  }

  get isReady(): boolean { return this.session !== null; }

  dispose(): void {
    this.session?.release();
    this.session = null;
  }
}

export const detectionService = new DetectionService();
