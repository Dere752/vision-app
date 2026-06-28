// Golden angle distribution for maximum perceptual distinction between 80 classes
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export interface ClassColor {
  hex: string;
  rgb: [number, number, number];
  rgba: (alpha: number) => string;
}

export const CLASS_COLORS: ClassColor[] = Array.from({ length: 80 }, (_, i) => {
  const hue = (i * 137.508) % 360; // golden angle
  const saturation = 80 + (i % 3) * 5;
  const lightness = 58 + (i % 2) * 4;
  const rgb = hslToRgb(hue, saturation, lightness);
  const hex = `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
  return {
    hex,
    rgb,
    rgba: (alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`,
  };
});
