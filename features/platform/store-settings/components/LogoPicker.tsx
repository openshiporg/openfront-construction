"use client";

import { useMemo, useState } from "react";
import { LOGO_ICONS } from "../lib/untitled-logo-registry";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";
import { storefrontThemeTokens } from "@/features/lib/store-theme";

const CUSTOM = "custom";

/** Restaurant registry/sanitizer with every mark shown before selection, as in
 * E-commerce and Restaurant. Native radios give arrow-key and touch selection. */
export function LogoPicker({ value, hue, onChange, onHueChange }: {
  value: string;
  hue: string;
  onChange(value: string): void;
  onHueChange(value: string): void;
}) {
  const selected = LOGO_ICONS.find(icon => icon.lightSvg === value);
  const [custom, setCustom] = useState(!selected);
  const [draft, setDraft] = useState(value);
  const safe = sanitizeStoreLogoSvg(custom ? draft : value);
  const marks = useMemo(() => LOGO_ICONS.map(icon => ({ id: icon.id, name: icon.name, lightSvg: icon.lightSvg, svg: sanitizeStoreLogoSvg(icon.lightSvg) })), []);
  const rotation = `hue-rotate(${normalizeStoreLogoColor(hue)}deg)`;
  const choice = custom ? CUSTOM : selected?.id ?? CUSTOM;
  function choose(id: string) {
    if (id === CUSTOM) { setDraft(value); setCustom(true); return; }
    const icon = LOGO_ICONS.find(candidate => candidate.id === id);
    if (icon) { onChange(icon.lightSvg); setDraft(icon.lightSvg); setCustom(false); }
  }
  return <fieldset className="grid min-w-0 gap-4 rounded-lg border p-4 md:p-5">
    <legend className="px-2 text-sm font-semibold">Store logo</legend>
    <input type="hidden" name="logoIcon" value={custom ? draft : value} />
    <div role="radiogroup" aria-label="Logo" className="grid max-h-96 min-w-0 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2 overflow-y-auto p-1">
      {marks.map(mark => <label key={mark.id} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <input type="radio" name="logoChoice" value={mark.id} checked={choice === mark.id} onChange={() => choose(mark.id)} className="sr-only" />
        <span aria-hidden="true" className="block size-7 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: rotation }} dangerouslySetInnerHTML={{ __html: mark.svg }} />
        <span className="min-w-0 truncate">{mark.name}</span>
      </label>)}
      <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <input type="radio" name="logoChoice" value={CUSTOM} checked={choice === CUSTOM} onChange={() => choose(CUSTOM)} className="sr-only" />
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded border border-dashed font-mono text-[10px]">SVG</span>
        <span className="min-w-0 truncate">Custom SVG</span>
      </label>
    </div>
    {custom && <label className="grid gap-2 text-sm font-medium">Custom SVG
      <textarea className="min-h-32 w-full min-w-0 rounded-md border bg-background p-3 font-mono text-xs" maxLength={100000}
        spellCheck={false} value={draft} aria-invalid={Boolean(draft && !safe)} aria-describedby={draft && !safe ? "custom-logo-error" : undefined} onChange={event => setDraft(event.target.value)} />
      {draft && !safe && <span id="custom-logo-error" role="alert" className="text-destructive">Enter a valid, safe SVG document.</span>}
    </label>}
    <div className="flex flex-wrap items-end gap-4">
      <label className="grid gap-2 text-sm font-medium">Logo hue
        <input name="logoColor" type="number" min="0" max="359" step="1" value={hue} className="min-h-11 min-w-11 w-32 rounded-md border bg-background px-3"
          onChange={event => onHueChange(event.target.value)} />
      </label>
      {custom && <button type="button" className="min-h-11 min-w-11 rounded-md border px-4" onClick={() => { setDraft(""); onChange(""); }}>Clear logo</button>}
    </div>
    <div className="grid gap-2 text-sm font-medium">
      <span id="storefront-preview-label">Storefront preview</span>
      <div role="group" aria-labelledby="storefront-preview-label" className="storefront flex min-w-0 flex-wrap items-center gap-4 rounded-md border p-4" style={storefrontThemeTokens(hue)}>
        <span role="img" aria-label="Logo" className="block size-12 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" style={{ filter: rotation }} dangerouslySetInnerHTML={{ __html: safe }} />
        <span className="sf-btn" aria-hidden="true">Request a quote</span>
      </div>
    </div>
  </fieldset>;
}
