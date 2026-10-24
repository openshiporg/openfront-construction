'use client';

import { useActionState } from "react";

import { FormFeedback, Track, pillClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { transitionTradePartnerAction } from "../actions";
import { partnerTransitions } from "../lib/states";
import { keepUnlessSaved } from "@/features/lib/form-reset";

const verbs: Record<string, string> = { approved: "Approve", inactive: "Mark inactive", blocked: "Block", prospective: "Unblock" };

export function PartnerStatusControl({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(transitionTradePartnerAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const moves = partnerTransitions[status] ?? [];
  if (!moves.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Track label="Change status">
        {moves.map(to => (
          <form key={to} action={action} onReset={keepUnlessSaved(state.status === "success")}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="from" value={status} />
            <input type="hidden" name="to" value={to} />
            <button disabled={pending} className={pillClass(to === "blocked" ? "danger" : to === "approved" ? "primary" : "raised", "sm")}>{verbs[to] ?? to}</button>
          </form>
        ))}
      </Track>
      <FormFeedback status={state.status} message={state.status === "error" ? state.message : ""} />
    </div>
  );
}
