'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPublicIntakeAction } from "../actions";
import { initialPublicIntakeState } from "../types";

export type PublicIntakeKind = "general_contact" | "project_inquiry" | "estimate_request" | "rfp_invitation" | "trade_partner_interest";

type FormMode = "contact" | "project" | "trade";

const fieldClass = "sf-form__field";
const selectClass = "sf-select";

export function PublicIntakeForm({
  kind,
  sourcePath,
  mode,
  privacyNoticeDigest,
}: {
  kind: PublicIntakeKind;
  sourcePath: string;
  mode: FormMode;
  privacyNoticeDigest?: string;
}) {
  const [state, action, pending] = useActionState(submitPublicIntakeAction, initialPublicIntakeState);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const isProject = mode === "project";
  const isTrade = mode === "trade";

  if (state.status === "success" && state.publicReference) {
    return (
      <div className="sf-receipt" role="status" aria-live="polite" style={{ marginTop: 0 }}>
        <span className="sf-receipt__mark" aria-hidden="true"><Check className="size-5" /></span>
        <h2 className="sf-doc__title" style={{ marginTop: "var(--space-md)", fontSize: "var(--text-xl)" }}>Thanks — we’ve received your inquiry</h2>
        <p className="sf-doc__lede" style={{ marginTop: "var(--space-sm)", fontSize: "var(--text-sm)" }}>{state.message} This is an acknowledgement, not an estimate, a bid award, a contract, or a promise to do work.</p>
        <p style={{ marginTop: "var(--space-md)", fontSize: "var(--text-sm)" }}><span style={{ color: "var(--sf-muted)" }}>Reference</span> <strong className="sf-mono-strong">{state.publicReference}</strong></p>
        <Link href={`/requests/${encodeURIComponent(state.publicReference)}/confirmation`} className="sf-morelink" style={{ marginTop: "var(--space-md)" }}>View confirmation page <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <form action={action} className="sf-form" aria-describedby="public-intake-boundary">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="sourcePath" value={sourcePath} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {privacyNoticeDigest && <input type="hidden" name="privacyNoticeDigest" value={privacyNoticeDigest} />}
      <label className="sf-honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className="sf-form__fieldset">
        <legend className="sf-form__legend">Your contact details</legend>
        <div className="sf-form__grid">
          <label className={fieldClass}>Name<Input name="contactName" autoComplete="name" required minLength={2} maxLength={200} /></label>
          <label className={fieldClass}>{isTrade ? "Trade company" : "Organization"}<Input name="organization" autoComplete="organization" required={isProject || isTrade} maxLength={240} /></label>
          <label className={fieldClass}>Email<Input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
          <label className={fieldClass}>Phone<Input name="phone" type="tel" autoComplete="tel" maxLength={50} /></label>
          <label className={`${fieldClass} sf-form__span2`}>Your role<Input name="contactRole" autoComplete="organization-title" maxLength={160} placeholder={isTrade ? "Estimator, owner, project manager…" : "Owner, developer, architect, procurement…"} /></label>
        </div>
      </fieldset>

      {isProject && (
        <fieldset className="sf-form__fieldset">
          <legend className="sf-form__legend">About the project</legend>
          <div className="sf-form__grid">
            <label className={fieldClass}>Project name<Input name="projectName" required maxLength={240} /></label>
            <label className={fieldClass}>Project type<Input name="projectType" required maxLength={160} placeholder="Commercial renovation, civil, healthcare…" /></label>
            <label className={`${fieldClass} sf-form__span2`}>Project location or region<Input name="locationSummary" required maxLength={500} placeholder="City, state, or general region" /></label>
            <label className={fieldClass}>Delivery method
              <FormSelect name="deliveryMethod" required={kind === "rfp_invitation"} defaultValue="" className={selectClass}>
                <option value="">Not decided</option>
                <option value="design_bid_build">Design-bid-build</option>
                <option value="design_build">Design-build</option>
                <option value="construction_manager_at_risk">CM at risk</option>
                <option value="construction_management">Construction management</option>
                <option value="other">Other / to discuss</option>
              </FormSelect>
            </label>
            <label className={fieldClass}>Rough budget range
              <FormSelect name="budgetRange" defaultValue="" className={selectClass}>
                <option value="">Not established</option>
                <option value="under_250k">Under 250k</option>
                <option value="250k_1m">250k–1m</option>
                <option value="1m_5m">1m–5m</option>
                <option value="5m_20m">5m–20m</option>
                <option value="over_20m">Over 20m</option>
              </FormSelect>
            </label>
            <label className={fieldClass}>Desired start<Input name="desiredStart" type="date" /></label>
            <label className={fieldClass}>Desired completion<Input name="desiredCompletion" type="date" /></label>
            <label className={`${fieldClass} sf-form__span2`}>Current design stage<Input name="designStage" maxLength={160} placeholder="Concept, schematic, permit set…" /></label>
            <label className={`${fieldClass} sf-form__span2`}>Services sought<Input name="servicesSought" required maxLength={600} placeholder="Preconstruction, general contracting, design-build…" /></label>
            <label className={`${fieldClass} sf-form__span2`}>Project details<Textarea name="scopeSummary" required minLength={10} maxLength={5000} className="sf-textarea" placeholder={kind === "rfp_invitation" ? "Summarize the project, deadline, and scope so we can review the bid invitation." : "Describe the work, the site, and any decisions already made."} /></label>
            <label className={`${fieldClass} sf-form__span2`}>How did you hear about us?<Input name="referralSource" maxLength={240} /></label>
          </div>
        </fieldset>
      )}

      {isTrade && (
        <fieldset className="sf-form__fieldset">
          <legend className="sf-form__legend">About your company</legend>
          <div className="sf-form__grid">
            <label className={fieldClass}>Trade or specialty<Input name="projectType" required maxLength={160} placeholder="Electrical, concrete, material supplier…" /></label>
            <label className={fieldClass}>Service area<Input name="locationSummary" required maxLength={500} /></label>
            <label className={`${fieldClass} sf-form__span2`}>Your experience and interest<Textarea name="scopeSummary" required minLength={10} maxLength={5000} className="sf-textarea" placeholder="Describe your scopes, licensing, geographic coverage, and the work you want to be considered for." /></label>
            <label className={`${fieldClass} sf-form__span2`}>Referral or contractor contact<Input name="referralSource" maxLength={240} /></label>
          </div>
        </fieldset>
      )}

      {mode === "contact" && (
        <fieldset className="sf-form__fieldset">
          <legend className="sf-form__legend">Message</legend>
          <div className="sf-form__grid">
            <label className={`${fieldClass} sf-form__span2`}>How can we help?<Textarea name="scopeSummary" required minLength={10} maxLength={5000} className="sf-textarea" /></label>
            <label className={`${fieldClass} sf-form__span2`}>Topic<Input name="referralSource" maxLength={240} placeholder="General inquiry, referral, press, careers…" /></label>
          </div>
        </fieldset>
      )}

      <div className="sf-form__footer">
        <label className="sf-form__consent" style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-start" }}>
          <input name="privacyConsent" type="checkbox" required className="sf-check" />
          <span>I agree to this company keeping the details I provide and contacting me about this inquiry. This does not begin any work or create a contract. <Link href="/privacy" className="sf-line-link">Privacy details</Link></span>
        </label>
        <p id="public-intake-boundary" className="sf-form__note">Please do not submit card numbers, bank details, government IDs, medical or safety-incident records, or confidential project files through this form.</p>
        <button type="submit" disabled={pending} className="sf-btn" style={{ marginTop: "var(--space-md)" }}>{pending ? "Sending…" : isTrade ? "Submit your information" : kind === "general_contact" ? "Send inquiry" : "Send project request"} <ArrowRight className="size-4" aria-hidden="true" /></button>
        {state.status === "error" && <p role="alert" className="sf-form__error" style={{ color: "var(--sf-error)", fontSize: "var(--text-sm)", marginTop: "var(--space-md)" }}>{state.message}</p>}
      </div>
    </form>
  );
}
