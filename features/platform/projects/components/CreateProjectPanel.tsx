'use client';

import Link from "next/link";
import { Plus } from "lucide-react";
import { FormSelect } from "@/features/forms/components/FormSelect";
import { projectToolHref } from "@/features/platform/lib/navigation";

import { DisclosurePanel, FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { createConstructionProjectAction } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import type { CompanySummary } from "../data";

export function CreateProjectPanel({ companies: allCompanies, defaultOpen = false }: { companies: CompanySummary[]; defaultOpen?: boolean }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(createConstructionProjectAction);
  const companies = allCompanies.filter(company => company.canCreateProject);
  if (!companies.length) return null;

  return (
    <DisclosurePanel title="New project" icon={Plus} defaultOpen={defaultOpen}>
      <form action={action} className="grid min-w-0 gap-4 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-4">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className={fieldLabelClass}>Company<FormSelect name="companyId" className={selectClass}>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</FormSelect></label>
        <label className={fieldLabelClass}>Project number<input name="projectNumber" required className={`${inputClass} font-mono`} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Project name<input name="name" required className={inputClass} /></label>
        <label className={fieldLabelClass}>Start date<input name="startDate" type="date" className={inputClass} /></label>
        <label className={fieldLabelClass}>Budget currency<input name="currencyCode" value="USD" readOnly required className={`${inputClass} bg-muted/40 font-mono`} /></label>
        <label className={`${fieldLabelClass} md:col-span-2`}>Scope summary<textarea name="description" className={`${textareaClass} min-h-10`} rows={1} /></label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
          <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Creating…" : "Create project"}</button></span>
          <FormFeedback status={state.status} message={state.message} />
          {state.status === "success" && state.itemId ? <Link href={projectToolHref(state.itemId, "")} className="text-sm font-medium underline underline-offset-4">Open project</Link> : null}
        </div>
      </form>
    </DisclosurePanel>
  );
}
