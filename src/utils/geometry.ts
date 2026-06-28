import type { BoundingBox } from '../types';

export function iou(a: BoundingBox, b: BoundingBox): number {
  const ax1 = a.x - a.width / 2;
  const ay1 = a.y - a.height / 2;
  const ax2 = a.x + a.width / 2;
  const ay2 = a.y + a.height / 2;

  const bx1 = b.x - b.width / 2;
  const by1 = b.y - b.height / 2;
  const bx2 = b.x + b.width / 2;
  const by2 = b.y + b.height / 2;

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  if (interX2 <= interX1 || interY2 <= interY1) return 0;

  const inter = (interX2 - interX1) * (interY2 - interY1);
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  return inter / (aArea + bArea - inter);
}

/** Cost matrix for Hungarian-like assignment: rows = detections, cols = tracks */
export function buildIoUMatrix(
  detections: BoundingBox[],
  tracks: BoundingBox[]
): number[][] {
  return detections.map(d => tracks.map(t => 1 - iou(d, t)));
}

/** Greedy nearest-neighbor assignment (good enough, O(D*T) per frame) */
export function greedyAssign(
  costMatrix: number[][],
  threshold: number
): { detIdx: number; trkIdx: number }[] {
  const numDet = costMatrix.length;
  const numTrk = costMatrix[0]?.length ?? 0;
  const usedDet = new Set<number>();
  const usedTrk = new Set<number>();
  const assignments: { detIdx: number; trkIdx: number }[] = [];

  // Collect all (cost, detIdx, trkIdx) pairs and sort by cost ascending
  const pairs: [number, number, number][] = [];
  for (let d = 0; d < numDet; d++) {
    for (let t = 0; t < numTrk; t++) {
      pairs.push([costMatrix[d][t], d, t]);
    }
  }
  pairs.sort((a, b) => a[0] - b[0]);

  for (const [cost, d, t] of pairs) {
    if (cost >= threshold) break;
    if (usedDet.has(d) || usedTrk.has(t)) continue;
    usedDet.add(d);
    usedTrk.add(t);
    assignments.push({ detIdx: d, trkIdx: t });
  }

  return assignments;
}

export function bboxToPixels(
  bbox: BoundingBox,
  canvasW: number,
  canvasH: number
): { x: number; y: number; w: number; h: number } {
  const w = bbox.width * canvasW;
  const h = bbox.height * canvasH;
  return {
    x: bbox.x * canvasW - w / 2,
    y: bbox.y * canvasH - h / 2,
    w,
    h,
  };
}
