import type { Detection } from '../types';
import { iou } from './geometry';

export function applyNMS(detections: Detection[], iouThreshold: number): Detection[] {
  if (detections.length === 0) return [];

  // Sort descending by confidence
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const suppressed = new Uint8Array(sorted.length);
  const result: Detection[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed[i]) continue;
    result.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed[j]) continue;
      if (sorted[i].classId === sorted[j].classId) {
        if (iou(sorted[i].bbox, sorted[j].bbox) > iouThreshold) {
          suppressed[j] = 1;
        }
      }
    }
  }

  return result;
}
