'use client';

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { onboardConstructionWorkspaceAction } from "../actions/onboarding";

const fieldClass = "grid gap-1.5 text-sm font-medium";

export function OnboardingForm({ onComplete }: { onComplete?(state: CommandState): void }) {
  const [state, action, pending] = useActionState(onboardConstructionWorkspaceAction, initialCommandState);
  const [key] = useState(() => crypto.randomUUID());
  const [publishFirstProject, setPublishFirstProject] = useState(false);
  useEffect(() => {
    if (state.status === "success") onComplete?.(state);
  }, [state, onComplete]);

  return (
    <form action={action} className="grid gap-6" aria-labelledby="workspace-details-title">
      <input type="hidden" name="idempotencyKey" value={key} />
      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:p-5">
        <legend id="workspace-details-title" className="px-2 text-sm font-semibold">Contractor identity</legend>
        <label className={fieldClass}>Company name<Input name="companyName" required maxLength={200} /></label>
        <label className={fieldClass}>Workspace slug<Input name="companySlug" required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="northstar-builders" /></label>
        <label className={fieldClass}>Legal name<Input name="legalName" maxLength={240} /></label>
        <label className={fieldClass}>Brand name<Input name="brandName" required minLength={2} maxLength={120} /></label>
        <label className={fieldClass}>Brand mark<Input name="brandMark" required minLength={1} maxLength={4} pattern="[A-Za-z0-9]{1,4}" placeholder="NB" /></label>
        <label className={fieldClass}>Brand color<Input name="brandColor" type="color" defaultValue="#1D4ED8" required /></label>
        <label className={`${fieldClass} md:col-span-2`}>Tagline<Input name="brandTagline" maxLength={240} /></label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold">Public contractor profile</legend>
        <label className={fieldClass}>Public contact email<Input name="publicContactEmail" type="email" required maxLength={320} /></label>
        <label className={fieldClass}>Public contact phone<Input name="publicContactPhone" type="tel" maxLength={50} /></label>
        <label className={`${fieldClass} md:col-span-2`}>Service area<Input name="publicServiceArea" required maxLength={160} placeholder="Metro region and surrounding counties" /></label>
        <label className={`${fieldClass} md:col-span-2`}>Contractor capability summary<Textarea name="publicCapabilitySummary" required minLength={20} maxLength={1200} className="min-h-24" /></label>
        <label className={fieldClass}>Primary service<Input name="primaryServiceName" required maxLength={160} placeholder="General contracting" /></label>
        <label className={fieldClass}>Primary service summary<Input name="primaryServiceSummary" required minLength={20} maxLength={500} /></label>
        <label className={`${fieldClass} md:col-span-2`}>Public privacy notice<Textarea name="publicPrivacyNotice" required minLength={20} maxLength={1200} defaultValue="We use submitted contact and project details to review fit, respond to the request, and retain an accountable qualification record. Submission does not create an account, contract, estimate, or project." className="min-h-20" /></label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold">First project</legend>
        <label className={fieldClass}>Project number<Input name="projectNumber" required maxLength={80} placeholder="2026-001" /></label>
        <label className={fieldClass}>Project name<Input name="projectName" required maxLength={publishFirstProject ? 200 : 240} /></label>
        <label className={fieldClass}>Client<Input name="clientName" maxLength={240} placeholder="Project owner" /></label>
        <label className={fieldClass}>First trade partner<Input name="tradePartnerName" maxLength={240} placeholder="Subcontractor or vendor" /></label>
        <label className={fieldClass}>Start date<Input name="startDate" type="date" /></label>
        <label className={fieldClass}>Planned completion<Input name="completionDate" type="date" /></label>
        <label className={fieldClass}>Currency code<Input name="currencyCode" required maxLength={3} value="USD" readOnly aria-describedby="onboarding-currency-note" className="uppercase" /><span id="onboarding-currency-note" className="text-[11px] text-muted-foreground">USD only</span></label>
        <label className={`${fieldClass} md:col-span-2`}>Project description<Textarea name="projectDescription" maxLength={4000} className="min-h-24" /></label>
        <label className="flex min-h-11 items-start gap-3 border-t pt-4 text-sm md:col-span-2">
          <input name="publishFirstProject" type="checkbox" checked={publishFirstProject} onChange={event => setPublishFirstProject(event.target.checked)} className="mt-0.5 size-4" />
          <span className="font-medium">Publish a curated public project entry</span>
        </label>
        {publishFirstProject && <>
          <label className={`${fieldClass} md:col-span-2`}>Approved public summary<Textarea name="publicProjectSummary" required minLength={20} maxLength={600} className="min-h-20" /></label>
          <label className={fieldClass}>Market / sector<Input name="publicProjectMarket" maxLength={160} /></label>
          <label className={fieldClass}>General location label<Input name="publicProjectLocation" maxLength={200} placeholder="Central Ohio" /></label>
        </>}
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold">Initial work breakdown and budget</legend>
        <label className={fieldClass}>Cost code<Input name="costCode" required maxLength={40} placeholder="03-3000" /></label>
        <label className={fieldClass}>Cost code name<Input name="costCodeName" required maxLength={200} placeholder="Cast-in-place concrete" /></label>
        <label className={fieldClass}>Budget code<Input name="budgetCode" required maxLength={80} placeholder="03-3000-LAB" /></label>
        <label className={fieldClass}>Budget line description<Input name="budgetCodeDescription" required maxLength={240} /></label>
      </fieldset>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
        <Button type="submit" disabled={pending} className="min-h-11">{pending ? "Creating workspace…" : "Create workspace"}</Button>
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
