"use client";

import { useMemo } from "react";

import { TouchSlider as Slider } from "@/features/forms/components/TouchSlider";
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
}: {
  value: string;
  onChange: (hex: string) => void;
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
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {HUE_PRESETS.map(preset => (
          <button
            key={preset.name}
            type="button"
            aria-label={`Use ${preset.name}`}
            className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
              value.toLowerCase() === hexFromHue(preset.hue).toLowerCase()
                ? "border-foreground bg-muted"
                : "border-border hover:bg-muted/50"
            }`}
            style={{ ["--swatch" as string]: hexFromHue(preset.hue) }}
            onClick={() => onChange(hexFromHue(preset.hue))}
          >
            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: `var(--swatch)` }} />
            {preset.name}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Hue</span>
          <span className="font-mono">{hue}° · {value.toLowerCase()}</span>
        </div>
        <Slider
          min={0}
          max={360}
          step={1}
          value={[hue]}
          onValueChange={([h]) => onChange(hexFromHue(h))}
          aria-label="Initials badge hue"
        />
      </div>
    </div>
  );
}
