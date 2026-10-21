/**
 * Constrained brand hue presets for the platform store-settings screen.
 * Mirrors the Openfront Ecommerce / Restaurant store-settings color picker:
 * the operator picks from a small set of named hues (plus fine hue rotation),
 * never an arbitrary free-form color, so the public brand color stays a
 * platform-owned, constrained value.
 */
export const HUE_PRESETS = [
  { name: "Slate", hue: 220 },
  { name: "Blue", hue: 235 },
  { name: "Teal", hue: 180 },
  { name: "Green", hue: 140 },
  { name: "Amber", hue: 40 },
  { name: "Orange", hue: 25 },
  { name: "Red", hue: 350 },
  { name: "Violet", hue: 270 },
] as const;

export type HuePresetName = (typeof HUE_PRESETS)[number]["name"];

/** Convert an HSL hue (0–360) + fixed saturation/lightness to a #rrggbb hex. */
export function hexFromHue(hue: number, sat = 0.55, light = 0.42): string {
  const h = ((hue % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const to = (v: number) => Math.round((v + m) * 255);
  return `#${[r, g, b].map(v => to(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Estimate the hue of a #rrggbb hex so the picker can reflect a persisted color. */
export function hueFromHex(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 220;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 220;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return Math.round(h);
}

export function isConstrainedHueColor(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}
