import type { Track, AppSettings } from '../../types';
import { CLASS_COLORS } from '../../config/colors';
import { bboxToPixels } from '../../utils/geometry';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function drawCornerAccents(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, opacity: number, size = 14
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';

  const corners = [
    [x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1],
  ] as const;

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * size, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  track: Track,
  x: number, y: number,
  settings: AppSettings,
  canvasW: number
): void {
  const label = [
    track.className.charAt(0).toUpperCase() + track.className.slice(1),
    settings.showConfidence ? `${Math.round(track.confidence * 100)}%` : '',
    settings.showIds ? `#${track.id}` : '',
  ].filter(Boolean).join('  ');

  const fontSize = settings.labelSize;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;

  const textW = ctx.measureText(label).width;
  const pad = 9;
  const pillW = textW + pad * 2;
  const pillH = fontSize + pad * 1.4;
  let pillX = Math.max(4, Math.min(x, canvasW - pillW - 4));
  const pillY = y - pillH - 5;

  const color = CLASS_COLORS[track.classId];

  // Pill background
  ctx.save();
  ctx.globalAlpha = Math.min(track.opacity, 0.95);
  ctx.fillStyle = color.rgba(0.88);
  roundedRect(ctx, pillX, Math.max(4, pillY), pillW, pillH, pillH / 2);
  ctx.fill();

  // Pill text
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pillX + pad, Math.max(4, pillY) + pillH / 2);
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  tracks: Track[],
  settings: AppSettings,
  canvasW: number,
  canvasH: number
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);

  if (settings.showScanLines) {
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < canvasH; y += 3) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, y, canvasW, 1);
    }
    ctx.restore();
  }

  const confirmed = tracks.filter(t => t.state !== 'tentative' || t.hits > 0);

  for (const track of confirmed) {
    const op = Math.max(0, Math.min(1, track.opacity));
    if (op < 0.05) continue;

    const box = bboxToPixels(track.smoothBbox, canvasW, canvasH);
    const { x, y, w, h } = box;
    if (w < 2 || h < 2) continue;

    const color = CLASS_COLORS[track.classId];
    const radius = Math.min(12, w * 0.08, h * 0.08);

    // Semi-transparent glass fill
    ctx.save();
    ctx.globalAlpha = op * settings.boxOpacity;
    ctx.fillStyle = color.rgba(1);
    roundedRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();

    // Animated border with glow
    ctx.save();
    ctx.globalAlpha = op * 0.85;
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = 8;
    roundedRect(ctx, x, y, w, h, radius);
    ctx.stroke();
    ctx.restore();

    // Corner accents (Apple-style)
    drawCornerAccents(ctx, x, y, w, h, color.hex, op * 0.9);

    // Label
    if (settings.showLabels) {
      drawLabel(ctx, track, x, y, settings, canvasW);
    }
  }
}
