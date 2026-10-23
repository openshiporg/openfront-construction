"use client";

import { useMemo } from "react";

import { TouchSlider as Slider } from "@/features/forms/components/TouchSlider";
import { pillClass, trackClass } from "@/features/platform/components/kit";
import { HUE_PRESETS, hexFromHue } from "../lib/brand-color";

/**
 * Constrained color picker for the company's initials badge, shown where no
 * logo is set. The storefront theme follows the logo hue instead (see
 * features/lib/store-theme.ts). The operator chooses a named hue and can
 * fine-tune it within a fixed saturation/lightness band, always producing a
 * #rrggbb hex.
 */
export function BrandColorPicker({
  value,
  onChange,
  initials = "",
}: {
  value: string;
  onChange: (hex: string) => void;
  initials?: string;
}) {
  const hue = useMemo(() => {
    const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
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
  }, [value]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold uppercase text-white" style={{ backgroundColor: value }}>{initials.slice(0, 4) || "AB"}</span>
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <div role="radiogroup" aria-label="Badge colour" className={`${trackClass} max-w-none`}>
            {HUE_PRESETS.map(preset => {
              const hex = hexFromHue(preset.hue);
              const active = value.toLowerCase() === hex.toLowerCase();
              return (
                <button key={preset.name} type="button" role="radio" aria-checked={active} aria-label={`Use ${preset.name}`} onClick={() => onChange(hex)} className={pillClass(active ? "raised" : "quiet", "sm")}>
                  <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: hex }} />{preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Hue</span>
          <span className="font-mono tabular-nums">{hue}° · {value.toLowerCase()}</span>
        </div>
        <Slider min={0} max={360} step={1} value={[hue]} onValueChange={([h]) => onChange(hexFromHue(h))} aria-label="Initials badge hue" />
      </div>
    </div>
  );
}
