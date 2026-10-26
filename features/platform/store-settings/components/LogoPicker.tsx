"use client";

import { useMemo, useState } from "react";
import { Shapes } from "lucide-react";
import { LOGO_ICONS } from "../lib/untitled-logo-registry";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";
import { storefrontThemeTokens } from "@/features/lib/store-theme";
import { Panel, fieldLabelClass, pillClass, trackClass } from "@/features/platform/components/kit";

const CUSTOM = "custom";

/** Untitled UI registry marks as tiles (Restaurant's registry and sanitizer).
 * Native radios give arrow-key and touch selection. The preview is the
 * website header in the derived theme. */
export function LogoPicker({ value, hue, onChange, onHueChange, brandName = "", tagline = "" }: {
  value: string;
  hue: string;
  onChange(value: string): void;
  onHueChange(value: string): void;
  brandName?: string;
  tagline?: string;
}) {
  const selected = LOGO_ICONS.find(icon => icon.lightSvg === value);
  const [custom, setCustom] = useState(!selected && Boolean(value));
  const [draft, setDraft] = useState(value);
  const safe = sanitizeStoreLogoSvg(custom ? draft : value);
  const marks = useMemo(() => LOGO_ICONS.map(icon => ({ id: icon.id, name: icon.name, lightSvg: icon.lightSvg, svg: sanitizeStoreLogoSvg(icon.lightSvg) })), []);
  const rotation = `hue-rotate(${normalizeStoreLogoColor(hue)}deg)`;
  const choice = custom ? CUSTOM : selected?.id ?? "";
  function choose(id: string) {
    if (id === CUSTOM) { setDraft(value); setCustom(true); return; }
    const icon = LOGO_ICONS.find(candidate => candidate.id === id);
    if (icon) { onChange(icon.lightSvg); setDraft(icon.lightSvg); setCustom(false); }
  }
  return (
    <Panel id="store-logo" title="Logo" icon={Shapes} actions={
      <div role="radiogroup" aria-label="Logo source" className={trackClass}>
        <button type="button" role="radio" aria-checked={!custom} onClick={() => { if (custom) choose(selected?.id ?? LOGO_ICONS[0].id); }} className={pillClass(custom ? "quiet" : "raised", "sm")}>Library</button>
        <button type="button" role="radio" aria-checked={custom} onClick={() => choose(CUSTOM)} className={pillClass(custom ? "raised" : "quiet", "sm")}>Custom SVG</button>
      </div>
    }>
      <div className="grid gap-5">
        <input type="hidden" name="logoIcon" value={custom ? draft : value} />
        <div role="group" aria-label="Website header preview" className="storefront sf-preview" style={storefrontThemeTokens(hue)}>
          <span role="img" aria-label="Logo" className="sf-preview__mark" style={{ filter: rotation }} dangerouslySetInnerHTML={{ __html: safe }} />
          <span className="sf-preview__name">{brandName || "Brand name"}{tagline ? <small>{tagline}</small> : null}</span>
          <span className="sf-btn sf-btn--sm" aria-hidden="true">Request an estimate</span>
        </div>

        {custom ? (
          <label className={fieldLabelClass}>Custom SVG
            <textarea className="min-h-32 w-full min-w-0 rounded-[6px] border bg-background p-3 font-mono text-xs text-foreground" maxLength={100000}
              spellCheck={false} value={draft} aria-invalid={Boolean(draft && !safe)} aria-describedby={draft && !safe ? "custom-logo-error" : undefined} onChange={event => setDraft(event.target.value)} />
            {draft && !safe && <span id="custom-logo-error" role="alert" className="text-destructive">Invalid or unsafe SVG</span>}
          </label>
        ) : (
          <div role="radiogroup" aria-label="Logo library" className="grid max-h-80 min-w-0 grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2 overflow-y-auto p-0.5">
            {marks.map(mark => (
              <label key={mark.id} title={mark.name} className="relative flex aspect-square cursor-pointer items-center justify-center rounded-[6px] border bg-background p-2.5 transition-shadow hover:bg-muted/50 has-[:checked]:border-foreground has-[:checked]:shadow-[0_0_0_1px_currentColor] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <input type="radio" name="logoChoice" value={mark.id} checked={choice === mark.id} onChange={() => choose(mark.id)} className="sr-only" aria-label={mark.name} />
                <span aria-hidden="true" className="block size-full overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: rotation }} dangerouslySetInnerHTML={{ __html: mark.svg }} />
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <label htmlFor="logo-color" className={`${fieldLabelClass} min-w-56 flex-1`}>
            <span className="flex items-center justify-between">Colour <span className="tabular-nums">{normalizeStoreLogoColor(hue)}°</span></span>
            <input id="logo-color" name="logoColor" type="range" min="0" max="359" step="1" value={normalizeStoreLogoColor(hue)} onChange={event => onHueChange(event.target.value)}
              className="h-3 w-full cursor-pointer appearance-none rounded-full [background:linear-gradient(90deg,#6366f1,#a855f7,#ec4899,#ef4444,#f97316,#eab308,#22c55e,#06b6d4,#6366f1)] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-foreground" />
          </label>
          {custom && <span className={trackClass}><button type="button" className={pillClass("danger", "sm")} onClick={() => { setDraft(""); onChange(""); }}>Clear logo</button></span>}
        </div>
      </div>
    </Panel>
  );
}
