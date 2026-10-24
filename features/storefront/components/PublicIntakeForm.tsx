'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { submitPublicIntakeAction } from "../actions";
import { initialPublicIntakeState } from "../types";
import { keepUnlessSaved } from "@/features/lib/form-reset";

export type PublicIntakeKind = "general_contact" | "project_inquiry" | "estimate_request" | "rfp_invitation" | "trade_partner_interest";

type FormMode = "contact" | "project" | "trade";

function Optional() {
  return <span className="sf-field__opt"> · optional</span>;
}

function Legend({ index, children }: { index: number; children: React.ReactNode }) {
  return <legend className="sf-legend"><span className="sf-legend__num">{String(index).padStart(2, "0")}</span>{children}</legend>;
}

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
      <div className="sf-ticket" role="status" aria-live="polite">
        <div className="sf-ticket__head">
          <p className="sf-kicker"><span className="sf-status"><span aria-hidden="true" className="sf-dot sf-dot--ok" />{state.replayed ? "Already received" : "Received"}</span></p>
          <p className="sf-display sf-h2" style={{ marginTop: "0.75rem" }}>Inquiry received</p>
        </div>
        <div className="sf-ticket__body">
          <div><p className="sf-small">Reference</p><p className="sf-ticket__ref">{state.publicReference}</p></div>
          <Link href={`/requests/${encodeURIComponent(state.publicReference)}/confirmation`} className="sf-track"><span className="sf-pill sf-pill--raised">Confirmation<ArrowRight /></span></Link>
        </div>
      </div>
    );
  }

  let step = 0;
  return (
    <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="sf-form" aria-describedby="public-intake-boundary">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="sourcePath" value={sourcePath} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {privacyNoticeDigest && <input type="hidden" name="privacyNoticeDigest" value={privacyNoticeDigest} />}
      <label className="sf-honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className="sf-fieldset">
        <Legend index={++step}>{isTrade ? "Your company" : "Your details"}</Legend>
        <div className="sf-grid2">
          <label className="sf-field">Name<input className="sf-input" name="contactName" autoComplete="name" required minLength={2} maxLength={200} /></label>
          <label className="sf-field"><span>{isTrade ? "Trade company" : "Organization"}{!(isProject || isTrade) && <Optional />}</span><input className="sf-input" name="organization" autoComplete="organization" required={isProject || isTrade} maxLength={240} /></label>
          <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={320} /></label>
          <label className="sf-field"><span>Phone<Optional /></span><input className="sf-input" name="phone" type="tel" autoComplete="tel" maxLength={50} /></label>
          <label className="sf-field sf-span2"><span>Role<Optional /></span><input className="sf-input" name="contactRole" autoComplete="organization-title" maxLength={160} placeholder={isTrade ? "Estimator, owner, PM" : "Owner, developer, architect"} /></label>
        </div>
      </fieldset>

      {isProject && (
        <fieldset className="sf-fieldset">
          <Legend index={++step}>The project</Legend>
          <div className="sf-grid2">
            <label className="sf-field">Project name<input className="sf-input" name="projectName" required maxLength={240} /></label>
            <label className="sf-field">Project type<input className="sf-input" name="projectType" required maxLength={160} placeholder="Commercial fit-out, civil, healthcare" /></label>
            <label className="sf-field sf-span2">Location<input className="sf-input" name="locationSummary" required maxLength={500} placeholder="City, state or region" /></label>
            <label className="sf-field sf-span2">Services needed<input className="sf-input" name="servicesSought" required maxLength={600} placeholder="Preconstruction, general contracting, design-build" /></label>
            <label className="sf-field sf-span2">Scope<textarea className="sf-textarea" name="scopeSummary" required minLength={10} maxLength={5000} /></label>
          </div>
        </fieldset>
      )}

      {isProject && (
        <fieldset className="sf-fieldset">
          <Legend index={++step}>Budget & timing</Legend>
          <div className="sf-grid2">
            <label className="sf-field"><span>Delivery method{kind !== "rfp_invitation" && <Optional />}</span>
              <FormSelect name="deliveryMethod" required={kind === "rfp_invitation"} defaultValue="" className="sf-select">
                <option value="">Not decided</option>
                <option value="design_bid_build">Design-bid-build</option>
                <option value="design_build">Design-build</option>
                <option value="construction_manager_at_risk">CM at risk</option>
                <option value="construction_management">Construction management</option>
                <option value="other">Other</option>
              </FormSelect>
            </label>
            <label className="sf-field"><span>Budget<Optional /></span>
              <FormSelect name="budgetRange" defaultValue="" className="sf-select">
                <option value="">Not set</option>
                <option value="under_250k">Under $250k</option>
                <option value="250k_1m">$250k–$1M</option>
                <option value="1m_5m">$1M–$5M</option>
                <option value="5m_20m">$5M–$20M</option>
                <option value="over_20m">Over $20M</option>
              </FormSelect>
            </label>
            <label className="sf-field"><span>Start<Optional /></span><input className="sf-input" name="desiredStart" type="date" /></label>
            <label className="sf-field"><span>Completion<Optional /></span><input className="sf-input" name="desiredCompletion" type="date" /></label>
            <label className="sf-field"><span>Design stage<Optional /></span><input className="sf-input" name="designStage" maxLength={160} placeholder="Concept, schematic, permit set" /></label>
            <label className="sf-field"><span>Referred by<Optional /></span><input className="sf-input" name="referralSource" maxLength={240} /></label>
          </div>
        </fieldset>
      )}

      {isTrade && (
        <fieldset className="sf-fieldset">
          <Legend index={++step}>Your trade</Legend>
          <div className="sf-grid2">
            <label className="sf-field">Trade or specialty<input className="sf-input" name="projectType" required maxLength={160} placeholder="Electrical, concrete, supplier" /></label>
            <label className="sf-field">Service area<input className="sf-input" name="locationSummary" required maxLength={500} /></label>
            <label className="sf-field sf-span2">Scopes, licensing and coverage<textarea className="sf-textarea" name="scopeSummary" required minLength={10} maxLength={5000} /></label>
            <label className="sf-field sf-span2"><span>Referral or contact<Optional /></span><input className="sf-input" name="referralSource" maxLength={240} /></label>
          </div>
        </fieldset>
      )}

      {mode === "contact" && (
        <fieldset className="sf-fieldset">
          <Legend index={++step}>Message</Legend>
          <div className="sf-grid2">
            <label className="sf-field sf-span2"><span>Topic<Optional /></span><input className="sf-input" name="referralSource" maxLength={240} placeholder="Referral, press, careers" /></label>
            <label className="sf-field sf-span2">Message<textarea className="sf-textarea" name="scopeSummary" required minLength={10} maxLength={5000} /></label>
          </div>
        </fieldset>
      )}

      <div className="sf-form__foot">
        <label className="sf-check">
          <input name="privacyConsent" type="checkbox" required />
          <span>I agree to my details being kept and used to reply to this inquiry. <Link href="/privacy" className="sf-link">Privacy</Link></span>
        </label>
        <p id="public-intake-boundary" className="sf-small">Do not send card, bank, ID, medical or incident details, or confidential files.</p>
        <div className="sf-track">
          <button type="submit" disabled={pending} className="sf-pill sf-pill--primary">
            {pending ? "Sending…" : isTrade ? "Send company details" : kind === "general_contact" ? "Send message" : kind === "rfp_invitation" ? "Send bid invitation" : "Send project request"}
            {pending ? null : <Check />}
          </button>
        </div>
        {state.status === "error" && <p role="alert" className="sf-error"><span aria-hidden="true" className="sf-dot sf-dot--stop" />{state.message}</p>}
      </div>
    </form>
  );
}
