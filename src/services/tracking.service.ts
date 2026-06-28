import type { Detection, Track, TrackState } from '../types';
import { CLASS_COLORS } from '../config/colors';
import { TRACKER_IOU_THRESHOLD, TRACKER_MAX_AGE, TRACKER_MIN_HITS, TRACKER_SMOOTH_ALPHA } from '../config/app';
import { buildIoUMatrix, greedyAssign } from '../utils/geometry';
import { BBoxSmoother } from '../utils/smoothing';

let nextId = 1;

class TrackedObject {
  readonly id: number;
  smoother: BBoxSmoother;
  classId: number;
  className: string;
  confidence: number;
  color: string;
  state: TrackState = 'tentative';
  age = 1;
  hits = 1;
  timeSinceUpdate = 0;
  opacity = 0;

  constructor(det: Detection) {
    this.id = nextId++;
    this.classId = det.classId;
    this.className = det.className;
    this.confidence = det.confidence;
    this.color = CLASS_COLORS[det.classId]?.hex ?? '#007AFF';
    this.smoother = new BBoxSmoother(TRACKER_SMOOTH_ALPHA);
    this.smoother.update(det.bbox);
  }

  update(det: Detection): void {
    this.classId = det.classId;
    this.className = det.className;
    this.confidence = det.confidence;
    this.color = CLASS_COLORS[det.classId]?.hex ?? '#007AFF';
    this.smoother.update(det.bbox);
    this.timeSinceUpdate = 0;
    this.hits++;
    this.age++;
    if (this.hits >= TRACKER_MIN_HITS) this.state = 'confirmed';
    this.opacity = Math.min(1, this.opacity + 0.15);
  }

  predict(): void {
    this.timeSinceUpdate++;
    this.age++;
    if (this.timeSinceUpdate > 1) this.state = 'lost';
    this.opacity = Math.max(0, this.opacity - 0.12);
  }

  toTrack(): Track {
    const raw = this.smoother.predict() ?? this.smoother.current!;
    const smooth = this.smoother.current!;
    return {
      id: this.id,
      bbox: raw,
      smoothBbox: smooth,
      classId: this.classId,
      className: this.className,
      confidence: this.confidence,
      color: this.color,
      state: this.state,
      age: this.age,
      hits: this.hits,
      timeSinceUpdate: this.timeSinceUpdate,
      opacity: this.opacity,
    };
  }
}

export class TrackingService {
  private tracks: Map<number, TrackedObject> = new Map();

  update(detections: Detection[]): Track[] {
    const activeTracks = [...this.tracks.values()];

    // Predict all tracks forward one frame
    activeTracks.forEach(t => t.predict());

    if (detections.length > 0 && activeTracks.length > 0) {
      const detBboxes = detections.map(d => d.bbox);
      const trkBboxes = activeTracks.map(t => t.smoother.current!);
      const costMatrix = buildIoUMatrix(detBboxes, trkBboxes);
      const assignments = greedyAssign(costMatrix, 1 - TRACKER_IOU_THRESHOLD);

      const matchedDet = new Set<number>();
      const matchedTrk = new Set<number>();

      for (const { detIdx, trkIdx } of assignments) {
        activeTracks[trkIdx].update(detections[detIdx]);
        matchedDet.add(detIdx);
        matchedTrk.add(trkIdx);
      }

      // Create new tracks for unmatched detections
      for (let i = 0; i < detections.length; i++) {
        if (!matchedDet.has(i)) {
          const t = new TrackedObject(detections[i]);
          this.tracks.set(t.id, t);
        }
      }
    } else {
      // No existing tracks — create all new
      for (const det of detections) {
        const t = new TrackedObject(det);
        this.tracks.set(t.id, t);
      }
    }

    // Delete expired tracks
    for (const [id, t] of this.tracks) {
      if (t.timeSinceUpdate > TRACKER_MAX_AGE) this.tracks.delete(id);
    }

    return [...this.tracks.values()]
      .filter(t => t.smoother.current !== null)
      .map(t => t.toTrack());
  }

  reset(): void {
    this.tracks.clear();
    nextId = 1;
  }
}

export const trackingService = new TrackingService();
