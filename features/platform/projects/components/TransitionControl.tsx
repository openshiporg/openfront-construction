'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transitionConstructionItem } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import type { WorkItem } from "../data";

export function TransitionControl({ projectId, item }: { projectId: string; item: WorkItem }) {
  const options = item.allowedTransitions;
  const { state, action, pending, idempotencyKey } = useKeyedCommand(transitionConstructionItem);
  if (!options.length) return <span className="text-xs text-muted-foreground">No next action</span>;

  return (
    <form action={action} className="grid min-w-56 gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="flex gap-2">
        {/* Remount after each status change so the choice reflects the new state. */}
        <FormSelect key={`${item.status}:${idempotencyKey}`} name="toStatus" aria-label={`Next status for ${item.title}`} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs">
          {options.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
        </FormSelect>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Saving…" : "Advance"}</Button>
      </div>
      <Input key={`${item.status}:${idempotencyKey}`} name="reason" aria-label={`Reason for ${item.title}`} required minLength={3} maxLength={500} placeholder="Reason for transition" className="h-8 text-xs" />
      {state.message && <span role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}</span>}
    </form>
  );
}
