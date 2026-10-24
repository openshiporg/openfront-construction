"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, Palette } from "lucide-react";

import { initialCommandState } from "@/features/platform/projects/action-state";
import { EmptyState, FormFeedback, Panel, fieldLabelClass, inputClass, pillClass, trackClass } from "@/features/platform/components/kit";
import { LogoPicker } from "../components/LogoPicker";
import { BrandColorPicker } from "../components/BrandColorPicker";
import { updateStoreSettingsAction } from "../actions/store-settings";
import { brandLogoSvg } from "../lib/brand-logo";
import { keepUnlessSaved } from "@/features/lib/form-reset";

export function StoreSettingsPageClient({
  initial,
  initialError,
}: {
  initial: {
    id: string;
    name: string;
    brandName: string;
    brandMark: string;
    brandTagline: string;
    brandColor: string;
    logoIcon: string;
    logoColor: string;
  } | null;
  initialError: string | null;
}) {
  const [state, action, pending] = useActionState(updateStoreSettingsAction, initialCommandState);
  const [id] = useState(initial?.id ?? "");
  const [logoIcon, setLogoIcon] = useState(brandLogoSvg(initial?.logoIcon));
  const [logoColor, setLogoColor] = useState(initial?.logoColor ?? "0");
  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [brandMark, setBrandMark] = useState(initial?.brandMark ?? "");
  const [brandTagline, setBrandTagline] = useState(initial?.brandTagline ?? "");
  const [brandColor, setBrandColor] = useState(initial?.brandColor && /^#[0-9a-f]{6}$/i.test(initial.brandColor) ? initial.brandColor : "#3650a8");

  if (initialError) return <EmptyState title={initialError} />;
  if (!initial) return <EmptyState title="No company yet" />;

  return (
    <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid gap-6">
      <input type="hidden" name="id" value={id} />
      <Panel id="identity" title="Brand" icon={BadgeCheck}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
          <label className={fieldLabelClass}>Brand name<input name="brandName" value={brandName} onChange={e => setBrandName(e.target.value)} required maxLength={120} className={inputClass} /></label>
          <label className={fieldLabelClass}>Initials<input name="brandMark" value={brandMark} onChange={e => setBrandMark(e.target.value)} required minLength={1} maxLength={4} pattern="[A-Za-z0-9]{1,4}" className={`${inputClass} font-mono uppercase`} /></label>
          <label className={`${fieldLabelClass} md:col-span-2`}>Tagline<input name="brandTagline" value={brandTagline} onChange={e => setBrandTagline(e.target.value)} maxLength={240} className={inputClass} /></label>
        </div>
      </Panel>

      <LogoPicker value={logoIcon} hue={logoColor} onChange={setLogoIcon} onHueChange={setLogoColor} brandName={brandName} tagline={brandTagline} />

      <Panel id="badge-color" title="Initials badge colour" icon={Palette}>
        <input type="hidden" name="brandColor" value={brandColor} />
        <BrandColorPicker value={brandColor} onChange={setBrandColor} initials={brandMark} />
      </Panel>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-full border bg-background/90 p-1.5 pr-4 shadow-sm backdrop-blur w-fit">
        <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save brand"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}
