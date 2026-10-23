'use client';

import { useActionState, useEffect, useState } from "react";

import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { onboardConstructionWorkspaceAction } from "../actions/onboarding";
import { FormFeedback, fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from "@/features/platform/components/kit";


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
      <fieldset className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 md:p-5">
        <legend id="workspace-details-title" className="px-2 text-sm font-semibold"><span className="mr-2 font-mono text-[11px] text-muted-foreground">01</span>Contractor identity</legend>
        <label className={fieldLabelClass}>Company name<input name="companyName" required maxLength={200} className={inputClass} /></label>
        <label className={fieldLabelClass}>Workspace slug<input name="companySlug" required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="northstar-builders" className={inputClass} /></label>
        <label className={fieldLabelClass}>Legal name<input name="legalName" maxLength={240} className={inputClass} /></label>
        <label className={fieldLabelClass}>Brand name<input name="brandName" required minLength={2} maxLength={120} className={inputClass} /></label>
        <label className={fieldLabelClass}>Brand mark<input name="brandMark" required minLength={1} maxLength={4} pattern="[A-Za-z0-9]{1,4}" placeholder="NB" className={inputClass} /></label>
        <label className={fieldLabelClass}>Brand color<input name="brandColor" type="color" defaultValue="#1D4ED8" required className={`${inputClass} p-1`} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Tagline<input name="brandTagline" maxLength={240} className={inputClass} /></label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold"><span className="mr-2 font-mono text-[11px] text-muted-foreground">02</span>Public contractor profile</legend>
        <label className={fieldLabelClass}>Public contact email<input name="publicContactEmail" type="email" required maxLength={320} className={inputClass} /></label>
        <label className={fieldLabelClass}>Public contact phone<input name="publicContactPhone" type="tel" maxLength={50} className={inputClass} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Service area<input name="publicServiceArea" required maxLength={160} placeholder="Metro region and surrounding counties" className={inputClass} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Contractor capability summary<textarea name="publicCapabilitySummary" required minLength={20} maxLength={1200} className={`${textareaClass} min-h-24`} /></label>
        <label className={fieldLabelClass}>Primary service<input name="primaryServiceName" required maxLength={160} placeholder="General contracting" className={inputClass} /></label>
        <label className={fieldLabelClass}>Primary service summary<input name="primaryServiceSummary" required minLength={20} maxLength={500} className={inputClass} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Public privacy notice<textarea name="publicPrivacyNotice" required minLength={20} maxLength={1200} defaultValue="We use submitted contact and project details to review fit, respond to the request, and retain an accountable qualification record. Submission does not create an account, contract, estimate, or project." className={`${textareaClass} min-h-20`} /></label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold"><span className="mr-2 font-mono text-[11px] text-muted-foreground">03</span>First project</legend>
        <label className={fieldLabelClass}>Project number<input name="projectNumber" required maxLength={80} placeholder="2026-001" className={inputClass} /></label>
        <label className={fieldLabelClass}>Project name<input name="projectName" required maxLength={publishFirstProject ? 200 : 240} className={inputClass} /></label>
        <label className={fieldLabelClass}>Client<input name="clientName" maxLength={240} placeholder="Project owner" className={inputClass} /></label>
        <label className={fieldLabelClass}>First trade partner<input name="tradePartnerName" maxLength={240} placeholder="Subcontractor or vendor" className={inputClass} /></label>
        <label className={fieldLabelClass}>Start date<input name="startDate" type="date" className={inputClass} /></label>
        <label className={fieldLabelClass}>Planned completion<input name="completionDate" type="date" className={inputClass} /></label>
        <label className={fieldLabelClass}>Currency code<input name="currencyCode" required maxLength={3} value="USD" readOnly className={`${inputClass} uppercase`} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Project description<textarea name="projectDescription" maxLength={4000} className={`${textareaClass} min-h-24`} /></label>
        <label className="flex min-h-11 items-start gap-3 border-t pt-4 text-sm md:col-span-2">
          <input name="publishFirstProject" type="checkbox" checked={publishFirstProject} onChange={event => setPublishFirstProject(event.target.checked)} className="mt-0.5 size-4" />
          <span className="font-medium">Publish a curated public project entry</span>
        </label>
        {publishFirstProject && <>
          <label className={`${fieldLabelClass} md:col-span-2`}>Approved public summary<textarea name="publicProjectSummary" required minLength={20} maxLength={600} className={`${textareaClass} min-h-20`} /></label>
          <label className={fieldLabelClass}>Market / sector<input name="publicProjectMarket" maxLength={160} className={inputClass} /></label>
          <label className={fieldLabelClass}>General location label<input name="publicProjectLocation" maxLength={200} placeholder="Central Ohio" className={inputClass} /></label>
        </>}
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 md:p-5">
        <legend className="px-2 text-sm font-semibold"><span className="mr-2 font-mono text-[11px] text-muted-foreground">04</span>Initial work breakdown and budget</legend>
        <label className={fieldLabelClass}>Cost code<input name="costCode" required maxLength={40} placeholder="03-3000" className={inputClass} /></label>
        <label className={fieldLabelClass}>Cost code name<input name="costCodeName" required maxLength={200} placeholder="Cast-in-place concrete" className={inputClass} /></label>
        <label className={fieldLabelClass}>Budget code<input name="budgetCode" required maxLength={80} placeholder="03-3000-LAB" className={inputClass} /></label>
        <label className={fieldLabelClass}>Budget line description<input name="budgetCodeDescription" required maxLength={240} className={inputClass} /></label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Creating workspace…" : "Create workspace"}</button></span>
      </div>
      {state.status === "error" && <FormFeedback status="error" message={state.message} />}
    </form>
  );
}
