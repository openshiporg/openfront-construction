'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { RecordLookup } from "@/features/forms/components/RecordLookup";

import { Button } from "@/components/ui/button";
import { addProjectMemberAction } from "../actions";
import type { ConstructionOption } from "../data";
import { useKeyedCommand } from "../use-keyed-command";

/** Adds an existing active company member to this project. */
export function TeamMemberPanel({ projectId, options }: { projectId: string; options: ConstructionOption[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(addProjectMemberAction);
  const projectUserIds = new Set(options.filter(option => option.kind === "user").map(option => option.id));
  const companyMembers = options.filter(option => option.kind === "companyMember");
  return (
    <section className="border-y bg-muted/20 px-4 py-5 md:px-6" aria-labelledby="member-panel-title">
      <h2 id="member-panel-title" className="mb-4 text-base font-semibold">Add a company member</h2>
      <form action={action} className="grid min-w-0 gap-3 [&>label]:min-w-0 md:grid-cols-[1fr_220px_auto]">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className="grid gap-1 text-xs font-medium">Company member<RecordLookup key={idempotencyKey} name="userId" projectId={projectId} kinds={["companyMember"]} initial={companyMembers} eligible={option => option.status === "active" && !projectUserIds.has(option.id)} required /></label>
        <label className="grid gap-1 text-xs font-medium">Access level<FormSelect name="accessLevel" defaultValue="viewer" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="manager">Manager</option></FormSelect></label>
        <div className="flex items-end"><Button disabled={pending}>{pending ? "Adding…" : "Add member"}</Button></div>
        {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-3 ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}</p>}
      </form>
    </section>
  );
}
