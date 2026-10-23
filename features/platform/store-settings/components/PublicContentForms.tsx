"use client";

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";
import { Globe } from "lucide-react";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { PUBLIC_PROJECT_LIMITS } from "@/features/lib/public-content-limits";
import { FormFeedback, Panel, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { savePublicContentAction, type PublicProfileSettings, type PublicServiceSettings, type PublicProjectSettings } from "../actions/store-settings";

function Result({ state }: { state: CommandState }) {
  return <FormFeedback status={state.status} message={state.message} />;
}
function Status({ value = "draft" }: { value?: string }) {
  return <label className={fieldLabelClass}>Publication<FormSelect name="status" defaultValue={value} className={selectClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></FormSelect></label>;
}
function Save({ pending, label }: { pending: boolean; label: string }) {
  return <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : label}</button></span>;
}

export function PublicProfileForm({ companyId, profile }: { companyId: string; profile: PublicProfileSettings | null }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <Panel id="public-profile" title="Public profile" icon={Globe}>
    <form action={action} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="profile" />
      <Status value={profile?.status} />
      <label className={fieldLabelClass}>Service area<input className={inputClass} name="serviceArea" required minLength={2} maxLength={240} defaultValue={profile?.serviceArea || ""} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Capability summary<textarea className={textareaClass} name="capabilitySummary" required minLength={20} maxLength={1200} defaultValue={profile?.capabilitySummary || ""} /></label>
      <label className={fieldLabelClass}>Contact email<input className={inputClass} name="inquiryEmail" type="email" required maxLength={320} defaultValue={profile?.inquiryEmail || ""} /></label>
      <label className={fieldLabelClass}>Contact phone<input className={inputClass} name="inquiryPhone" type="tel" maxLength={50} defaultValue={profile?.inquiryPhone || ""} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Privacy notice<textarea className={textareaClass} name="privacyNotice" required minLength={20} maxLength={1200} defaultValue={profile?.privacyNotice || ""} /></label>
      <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-full border px-4 text-sm font-medium has-[:checked]:border-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:col-span-2"><input className="size-4 accent-foreground" name="acceptingInquiries" type="checkbox" defaultChecked={profile?.acceptingInquiries ?? false} />Accept inquiries</label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Save pending={pending} label="Save profile" /><Result state={state} /></div>
    </form>
  </Panel>;
}

export function PublicServiceForm({ companyId, service }: { companyId: string; service?: PublicServiceSettings }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <form action={action} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5">
    <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="service" />{service && <input type="hidden" name="id" value={service.id} />}
    <label className={fieldLabelClass}>Service title<input className={inputClass} name="title" required minLength={2} maxLength={160} defaultValue={service?.title || ""} /></label>
    <label className={fieldLabelClass}>Market<input className={inputClass} name="market" maxLength={160} defaultValue={service?.market || ""} /></label>
    <label className={`${fieldLabelClass} sm:col-span-2`}>Summary<textarea className={`${textareaClass} min-h-20`} name="summary" required minLength={20} maxLength={500} defaultValue={service?.summary || ""} /></label>
    <label className={`${fieldLabelClass} sm:col-span-2`}>Details<textarea className={textareaClass} name="details" maxLength={4000} defaultValue={service?.details || ""} /></label>
    <Status value={service?.status} />
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Save pending={pending} label={service ? "Save service" : "Add service"} /><Result state={state} /></div>
  </form>;
}

export function PublicProjectForm({ companyId, project }: { companyId: string; project?: PublicProjectSettings }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <form action={action} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5">
    <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="project" />{project && <input type="hidden" name="id" value={project.id} />}
    <label className={`${fieldLabelClass} sm:col-span-2`}>Project title<input className={inputClass} name="title" required minLength={2} maxLength={200} defaultValue={project?.title || ""} /></label>
    <label className={`${fieldLabelClass} sm:col-span-2`}>Public summary<textarea className={`${textareaClass} min-h-20`} name="summary" required minLength={20} maxLength={600} defaultValue={project?.summary || ""} /></label>
    <label className={`${fieldLabelClass} sm:col-span-2`}>Public description<textarea className={textareaClass} name="description" maxLength={5000} defaultValue={project?.description || ""} /></label>
    <label className={fieldLabelClass}>Market<input className={inputClass} name="market" maxLength={160} defaultValue={project?.market || ""} /></label>
    <label className={fieldLabelClass}>General location<input className={inputClass} name="locationLabel" maxLength={200} defaultValue={project?.locationLabel || ""} /></label>
    <label className={fieldLabelClass}>Delivery method<input className={inputClass} name="deliveryMethod" maxLength={PUBLIC_PROJECT_LIMITS.deliveryMethod.max} defaultValue={project?.deliveryMethod || ""} /></label>
    <label className={fieldLabelClass}>Completion<input className={inputClass} name="completionLabel" maxLength={PUBLIC_PROJECT_LIMITS.completionLabel.max} defaultValue={project?.completionLabel || ""} /></label>
    <label className={`${fieldLabelClass} sm:col-span-2`}>Outcome<textarea className={textareaClass} name="approvedOutcome" maxLength={PUBLIC_PROJECT_LIMITS.approvedOutcome.max} defaultValue={project?.approvedOutcome || ""} /></label>
    <Status value={project?.status} />
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Save pending={pending} label={project ? "Save project" : "Add project"} /><Result state={state} /></div>
  </form>;
}
