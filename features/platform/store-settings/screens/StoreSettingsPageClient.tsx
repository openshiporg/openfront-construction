"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { LogoPicker } from "../components/LogoPicker";
import { BrandColorPicker } from "../components/BrandColorPicker";
import { updateStoreSettingsAction } from "../actions/store-settings";

const fieldClass = "grid gap-1.5 text-sm font-medium";

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
  const [logoIcon, setLogoIcon] = useState(initial?.logoIcon ?? "");
  const [logoColor, setLogoColor] = useState(initial?.logoColor ?? "0");
  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [brandMark, setBrandMark] = useState(initial?.brandMark ?? "");
  const [brandTagline, setBrandTagline] = useState(initial?.brandTagline ?? "");
  const [brandColor, setBrandColor] = useState(initial?.brandColor && /^#[0-9a-f]{6}$/i.test(initial.brandColor) ? initial.brandColor : "#3650a8");

  if (initialError) {
    return (
      <div className="border-y py-10">
        <h2 className="font-semibold">Store Settings unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{initialError}</p>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="border-y py-10">
        <h2 className="font-semibold">No company yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Finish onboarding to set up your company.</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={id} />
      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold">Public identity</legend>
        <label className={fieldClass}>Brand name<Input name="brandName" value={brandName} onChange={e => setBrandName(e.target.value)} required maxLength={120} /></label>
        <label className={fieldClass}>Brand mark<Input name="brandMark" value={brandMark} onChange={e => setBrandMark(e.target.value)} required minLength={1} maxLength={4} pattern="[A-Za-z0-9]{1,4}" /></label>
        <label className={`${fieldClass} md:col-span-2`}>Tagline<Input name="brandTagline" value={brandTagline} onChange={e => setBrandTagline(e.target.value)} maxLength={240} /></label>
      </fieldset>

      <LogoPicker value={logoIcon} hue={logoColor} onChange={setLogoIcon} onHueChange={setLogoColor} />

      <fieldset className="rounded-lg border p-4 md:p-5">
        <legend className="px-2 text-sm font-semibold">Initials badge color</legend>
        <div className="mt-3">
          <input type="hidden" name="brandColor" value={brandColor} />
          <BrandColorPicker value={brandColor} onChange={setBrandColor} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Store Settings"}</Button>
        {state.status === "success" && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
        {state.status === "error" && <p className="text-sm text-destructive" role="alert">{state.message}</p>}
      </div>
    </form>
  );
}
