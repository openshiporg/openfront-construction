'use client';

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/features/forms/components/FormSelect";
import { RecordLookup } from "@/features/forms/components/RecordLookup";
import { runConstructionCommand } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import { commandRelatedRecords, relatedOptionsFor } from "./workflow-fields";
import type { ConstructionOption } from "../data";

export type CommandOption = { value: string; label: string };

export function CommandPanel({
  projectId,
  title,
  options,
  referenceLabel = "Reference",
  titleLabel = "Title",
  referenceInputType = "text",
  hideDue = false,
  needsAmount = false,
  needsRelated = false,
  recordOptions,
}: {
  projectId: string;
  title: string;
  options: CommandOption[];
  referenceLabel?: string;
  titleLabel?: string;
  referenceInputType?: "text" | "date";
  hideDue?: boolean;
  needsAmount?: boolean;
  needsRelated?: boolean;
  recordOptions: ConstructionOption[];
}) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(runConstructionCommand);
  const [operation, setOperation] = useState(options[0]?.value || "");
  const related = needsRelated ? commandRelatedRecords[operation] : undefined;

  return (
    <section className="border-y bg-muted/20 px-4 py-5 md:px-6" aria-labelledby="command-panel-title">
      <h2 id="command-panel-title" className="mb-4 text-base font-semibold">{title}</h2>
      <form action={action} className="grid min-w-0 gap-3 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 [&_textarea]:min-w-0 md:grid-cols-2 xl:grid-cols-6">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label className="grid gap-1 text-xs font-medium">
          Action
          <FormSelect name="operation" className="h-9 rounded-md border bg-background px-3 text-sm" value={operation} onValueChange={nextValue => setOperation(nextValue)}>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </FormSelect>
        </label>
        {/* A new key (after a successful save) or a new operation starts with empty inputs. */}
        <CommandFields key={`${idempotencyKey}:${operation}`} projectId={projectId} operation={operation} related={related} recordOptions={recordOptions}
          referenceLabel={referenceLabel} titleLabel={titleLabel} referenceInputType={referenceInputType} hideDue={hideDue} needsAmount={needsAmount} />
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="min-h-11 w-full">{pending ? "Saving…" : "Save record"}</Button>
        </div>
        {state.message && (
          <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-2 xl:col-span-6 ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}

function CommandFields({ projectId, operation, related, recordOptions, referenceLabel, titleLabel, referenceInputType, hideDue, needsAmount }: {
  projectId: string;
  operation: string;
  related?: { label: string; kinds: string[]; statuses?: string[] };
  recordOptions: ConstructionOption[];
  referenceLabel: string;
  titleLabel: string;
  referenceInputType: "text" | "date";
  hideDue: boolean;
  needsAmount: boolean;
}) {
  return <>
    <label className="grid gap-1 text-xs font-medium">
      {referenceLabel}
      <Input name="reference" type={referenceInputType} required className="h-9" />
    </label>
    <label className="grid gap-1 text-xs font-medium md:col-span-2">
      {titleLabel}
      <Input name="title" required className="h-9" />
    </label>
    {!hideDue && (
      <label className="grid gap-1 text-xs font-medium">
        Due or record date
        <Input name="dueAt" type="date" className="h-9" />
      </label>
    )}
    {needsAmount && (
      <label className="grid gap-1 text-xs font-medium">
        Amount
        <Input name="amount" type="number" min="0" step="0.01" inputMode="decimal" className="h-9" />
      </label>
    )}
    {operation === "awardBidSubmission" && <label className="grid gap-1 text-xs font-medium">Retainage (basis points)<Input name="retainageBps" type="number" min="0" max="10000" step="1" inputMode="numeric" defaultValue="0" /></label>}
    {related && (
      <label className="grid gap-1 text-xs font-medium">
        {related.label}
        <RecordLookup name="relatedId" required projectId={projectId} kinds={related.kinds}
          initial={relatedOptionsFor(operation, recordOptions)}
          eligible={option => !related.statuses || !option.status || related.statuses.includes(option.status)} />
      </label>
    )}
    <label className="grid gap-1 text-xs font-medium md:col-span-2 xl:col-span-5">
      Description or notes
      <Textarea name="description" className="min-h-20 resize-y" />
    </label>
  </>;
}
