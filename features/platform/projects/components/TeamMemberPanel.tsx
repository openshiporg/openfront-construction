'use client';

import { UserPlus } from "lucide-react";
import { FormSelect } from "@/features/forms/components/FormSelect";
import { RecordLookup } from "@/features/forms/components/RecordLookup";

import { FormFeedback, Panel, fieldLabelClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";
import { addProjectMemberAction } from "../actions";
import type { ConstructionOption } from "../data";
import { useKeyedCommand } from "../use-keyed-command";
import { keepUnlessSaved } from "@/features/lib/form-reset";

/** Adds an existing active company member to this project. */
export function TeamMemberPanel({ projectId, options }: { projectId: string; options: ConstructionOption[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(addProjectMemberAction);
  const projectUserIds = new Set(options.filter(option => option.kind === "user").map(option => option.id));
  const companyMembers = options.filter(option => option.kind === "companyMember");
  return (
    <Panel id="member-panel" title="Add a company member" icon={UserPlus}>
      <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className={fieldLabelClass}>Company member<RecordLookup key={idempotencyKey} name="userId" projectId={projectId} kinds={["companyMember"]} initial={companyMembers} eligible={option => option.status === "active" && !projectUserIds.has(option.id)} required /></label>
        <label className={fieldLabelClass}>Access level<FormSelect name="accessLevel" defaultValue="viewer" className={selectClass}><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="manager">Manager</option></FormSelect></label>
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Adding…" : "Add member"}</button></span>
        <FormFeedback status={state.status} message={state.message} className="md:col-span-3" />
      </form>
    </Panel>
  );
}
