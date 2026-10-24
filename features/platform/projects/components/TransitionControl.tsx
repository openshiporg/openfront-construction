'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";

import { FormFeedback, inputClass, pillClass, readable, selectClass, trackClass } from "@/features/platform/components/kit";
import { transitionConstructionItem } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import type { WorkItem } from "../data";
import { keepUnlessSaved } from "@/features/lib/form-reset";

export function TransitionControl({ projectId, item }: { projectId: string; item: WorkItem }) {
  const options = item.allowedTransitions;
  const { state, action, pending, idempotencyKey } = useKeyedCommand(transitionConstructionItem);
  if (!options.length) return <span className="text-xs text-muted-foreground">No next step</span>;

  return (
    <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-2 sm:min-w-56">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="flex min-w-0 items-center gap-2">
        {/* Remount after each status change so the choice reflects the new state. */}
        <FormSelect key={`${item.status}:${idempotencyKey}`} name="toStatus" aria-label={`Next status for ${item.title}`} className={`${selectClass} h-8 flex-1 text-xs`}>
          {options.map(status => <option key={status} value={status}>{readable(status)}</option>)}
        </FormSelect>
        <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary", "sm")}>{pending ? "Saving…" : "Move"}</button></span>
      </div>
      <input key={`${item.status}:${idempotencyKey}`} name="reason" aria-label={`Reason for ${item.title}`} required minLength={3} maxLength={500} placeholder="Reason" className={`${inputClass} h-8 text-xs`} />
      <FormFeedback status={state.status} message={state.message} className="text-xs" />
    </form>
  );
}
