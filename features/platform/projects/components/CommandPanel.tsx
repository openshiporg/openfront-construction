'use client';

import { useState } from "react";

import { FilePlus2 } from "lucide-react";

import { RecordLookup } from "@/features/forms/components/RecordLookup";
import { runConstructionCommand } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import { commandRelatedRecords, relatedOptionsFor } from "./workflow-fields";
import type { ConstructionOption } from "../data";
import { FormFeedback, Panel, fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { keepUnlessSaved } from "@/features/lib/form-reset";

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
    <Panel id="command-panel" title={title} icon={FilePlus2}>
      <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="operation" value={operation} />
        {options.length > 1 && (
          <div className="relative -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:col-span-2 md:mx-0 md:px-0 xl:col-span-4">
            <div role="radiogroup" aria-label="Record type" className={`${trackClass} max-w-none`}>
              {options.map(option => <button key={option.value} type="button" role="radio" aria-checked={operation === option.value} onClick={() => setOperation(option.value)} className={pillClass(operation === option.value ? "raised" : "quiet", "sm")}>{option.label}</button>)}
            </div>
          </div>
        )}
        {/* A new key (after a successful save) or a new operation starts with empty inputs. */}
        <CommandFields key={`${idempotencyKey}:${operation}`} projectId={projectId} operation={operation} related={related} recordOptions={recordOptions}
          referenceLabel={referenceLabel} titleLabel={titleLabel} referenceInputType={referenceInputType} hideDue={hideDue} needsAmount={needsAmount} />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
          <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save"}</button></span>
          <FormFeedback status={state.status} message={state.message} />
        </div>
      </form>
    </Panel>
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
    <label className={fieldLabelClass}>
      {referenceLabel}
      <input name="reference" type={referenceInputType} required className={`${inputClass} font-mono`} />
    </label>
    <label className={`${fieldLabelClass} md:col-span-2`}>
      {titleLabel}
      <input name="title" required className={inputClass} />
    </label>
    {!hideDue && (
      <label className={fieldLabelClass}>
        Date
        <input name="dueAt" type="date" className={inputClass} />
      </label>
    )}
    {needsAmount && (
      <label className={fieldLabelClass}>
        Amount
        <input name="amount" type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} tabular-nums`} />
      </label>
    )}
    {operation === "awardBidSubmission" && <label className={fieldLabelClass}>Retainage (basis points)<input name="retainageBps" type="number" min="0" max="10000" step="1" inputMode="numeric" defaultValue="0" className={`${inputClass} tabular-nums`} /></label>}
    {related && (
      <label className={fieldLabelClass}>
        {related.label}
        <RecordLookup name="relatedId" required projectId={projectId} kinds={related.kinds}
          initial={relatedOptionsFor(operation, recordOptions)}
          eligible={option => !related.statuses || !option.status || related.statuses.includes(option.status)} />
      </label>
    )}
    <label className={`${fieldLabelClass} md:col-span-2 xl:col-span-4`}>
      Notes
      <textarea name="description" className={`${textareaClass} min-h-20 resize-y`} />
    </label>
  </>;
}
