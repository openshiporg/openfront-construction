"use client";

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { PUBLIC_PROJECT_LIMITS } from "@/features/lib/public-content-limits";
import { savePublicContentAction, type PublicProfileSettings, type PublicServiceSettings, type PublicProjectSettings } from "../actions/store-settings";

const field = "grid min-w-0 gap-1.5 text-sm font-medium";
const control = "min-h-11 min-w-11 w-full rounded-md border bg-background px-3 py-2 text-sm";
const button = "min-h-11 min-w-11 rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";
function Result({ state }: { state: CommandState }) {
  if (!state.message) return null;
  return state.status === "error"
    ? <p role="alert" className="text-sm text-destructive">{state.message}</p>
    : <p role="status" className="text-sm">{state.message}</p>;
}
function Status({ value = "draft" }: { value?: string }) {
  return <label className={field}>Publication status<FormSelect name="status" defaultValue={value} className={control}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></FormSelect></label>;
}
export function PublicProfileForm({ companyId, profile }: { companyId: string; profile: PublicProfileSettings | null }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <form action={action} className="grid min-w-0 gap-4 rounded-lg border p-5">
    <h2 className="text-lg font-semibold">Public profile</h2>
    <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="profile" />
    <Status value={profile?.status} />
    <label className={field}>Service area<input className={control} name="serviceArea" required minLength={2} maxLength={240} defaultValue={profile?.serviceArea || ""} /></label>
    <label className={field}>Capability summary<textarea className={`${control} min-h-24`} name="capabilitySummary" required minLength={20} maxLength={1200} defaultValue={profile?.capabilitySummary || ""} /></label>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2"><label className={field}>Contact email<input className={control} name="inquiryEmail" type="email" required maxLength={320} defaultValue={profile?.inquiryEmail || ""} /></label>
      <label className={field}>Contact phone<input className={control} name="inquiryPhone" type="tel" maxLength={50} defaultValue={profile?.inquiryPhone || ""} /></label></div>
    <label className={field}>Privacy notice<textarea className={`${control} min-h-24`} name="privacyNotice" required minLength={20} maxLength={1200} defaultValue={profile?.privacyNotice || ""} /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input className="size-5" name="acceptingInquiries" type="checkbox" defaultChecked={profile?.acceptingInquiries ?? false} />Accept inquiries</label>
    <button className={`${button} justify-self-start`} type="submit" disabled={pending}>{pending ? "Saving…" : "Save public profile"}</button>
    <Result state={state} />
  </form>;
}

export function PublicServiceForm({ companyId, service }: { companyId: string; service?: PublicServiceSettings }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <form action={action} className="grid min-w-0 gap-4 p-5">
    <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="service" />{service && <input type="hidden" name="id" value={service.id} />}
    <label className={field}>Service title<input className={control} name="title" required minLength={2} maxLength={160} defaultValue={service?.title || ""} /></label>
    <label className={field}>Summary<textarea className={`${control} min-h-20`} name="summary" required minLength={20} maxLength={500} defaultValue={service?.summary || ""} /></label>
    <label className={field}>Details<textarea className={`${control} min-h-24`} name="details" maxLength={4000} defaultValue={service?.details || ""} /></label>
    <label className={field}>Market<input className={control} name="market" maxLength={160} defaultValue={service?.market || ""} /></label>
    <Status value={service?.status} />
    <button className={`${button} justify-self-start`} type="submit" disabled={pending}>{pending ? "Saving…" : service ? "Save service" : "Add service"}</button>
    <Result state={state} />
  </form>;
}

export function PublicProjectForm({ companyId, project }: { companyId: string; project?: PublicProjectSettings }) {
  const [state, action, pending] = useActionState(savePublicContentAction, initialCommandState);
  return <form action={action} className="grid min-w-0 gap-4 p-5">
    <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="operation" value="project" />{project && <input type="hidden" name="id" value={project.id} />}
    <label className={field}>Project title<input className={control} name="title" required minLength={2} maxLength={200} defaultValue={project?.title || ""} /></label>
    <label className={field}>Public summary<textarea className={`${control} min-h-20`} name="summary" required minLength={20} maxLength={600} defaultValue={project?.summary || ""} /></label>
    <label className={field}>Public description<textarea className={`${control} min-h-24`} name="description" maxLength={5000} defaultValue={project?.description || ""} /></label>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className={field}>Market<input className={control} name="market" maxLength={160} defaultValue={project?.market || ""} /></label>
      <label className={field}>General location<input className={control} name="locationLabel" maxLength={200} defaultValue={project?.locationLabel || ""} /></label>
      <label className={field}>Delivery method<input className={control} name="deliveryMethod" maxLength={PUBLIC_PROJECT_LIMITS.deliveryMethod.max} defaultValue={project?.deliveryMethod || ""} /></label>
      <label className={field}>Completion state<input className={control} name="completionLabel" maxLength={PUBLIC_PROJECT_LIMITS.completionLabel.max} defaultValue={project?.completionLabel || ""} /></label>
    </div>
    <label className={field}>Outcome<textarea className={`${control} min-h-24`} name="approvedOutcome" maxLength={PUBLIC_PROJECT_LIMITS.approvedOutcome.max} defaultValue={project?.approvedOutcome || ""} /></label>
    <Status value={project?.status} />
    <button className={`${button} justify-self-start`} type="submit" disabled={pending}>{pending ? "Saving…" : project ? "Save public project" : "Add public project"}</button>
    <Result state={state} />
  </form>;
}
