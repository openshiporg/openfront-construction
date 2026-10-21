'use client';

import Link from "next/link";
import { FormSelect } from "@/features/forms/components/FormSelect";
import { projectToolHref } from "@/features/platform/lib/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createConstructionProjectAction } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import type { CompanySummary } from "../data";

export function CreateProjectPanel({ companies: allCompanies }: { companies: CompanySummary[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(createConstructionProjectAction);
  const companies = allCompanies.filter(company => company.canCreateProject);
  if (!companies.length) return null;

  return (
    <section className="border-y bg-muted/20 px-4 py-5 md:px-6" aria-labelledby="new-project-title">
      <h2 id="new-project-title" className="mb-4 text-base font-semibold">Create project</h2>
      <form action={action} className="grid min-w-0 gap-3 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 md:grid-cols-2 xl:grid-cols-5">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className="grid gap-1 text-xs font-medium">Company<FormSelect name="companyId" className="h-9 rounded-md border bg-background px-3 text-sm">{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</FormSelect></label>
        <label className="grid gap-1 text-xs font-medium">Project number<Input name="projectNumber" required /></label>
        <label className="grid gap-1 text-xs font-medium xl:col-span-2">Project name<Input name="name" required /></label>
        <label className="grid gap-1 text-xs font-medium">Start date<Input name="startDate" type="date" /></label>
        <label className="grid gap-1 text-xs font-medium">Budget currency<Input name="currencyCode" value="USD" readOnly aria-describedby="project-currency-note" required /><span id="project-currency-note" className="text-[11px] text-muted-foreground">Projects are budgeted in USD.</span></label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2 xl:col-span-4">Scope summary<Textarea name="description" className="min-h-20" /></label>
        <div className="flex items-end"><Button className="w-full" disabled={pending}>{pending ? "Creating…" : "Create project"}</Button></div>
        {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-2 xl:col-span-5 ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}{state.status === "success" && state.itemId && <> <Link href={projectToolHref(state.itemId, "")} className="font-medium underline underline-offset-4">Open project</Link></>}</p>}
      </form>
    </section>
  );
}
