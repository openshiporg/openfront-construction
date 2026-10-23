"use client";

import { useActionState, useEffect, useState } from "react";

import { SAMPLE_WORKSPACE_SUMMARY } from "@/features/keystone/domain/onboarding-manifest";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { loadDemoFixtureAction } from "../actions/onboarding";
import { FormFeedback, pillClass, trackClass } from "@/features/platform/components/kit";

/** The fictional sample workspace. It submits a normal onboarding request
 * (onboardConstructionWorkspace), and every record stays labelled fictional. */
export function DemoFixtureForm({ onComplete }: { onComplete?(state: CommandState): void }) {
  const [state, action, pending] = useActionState(loadDemoFixtureAction, initialCommandState);
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (state.status === "success") onComplete?.(state);
  }, [state, onComplete]);
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-dashed p-4 md:p-5" aria-labelledby="demo-fixture-title">
      <input type="hidden" name="idempotencyKey" value={key} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"><span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />Sample data</span>
        <h2 id="demo-fixture-title" className="font-semibold">Northstar Builders · Civic Learning Center</h2>
      </div>
      <p className="text-sm text-muted-foreground">Fictional company, client and project</p>
      <ul className="grid gap-1.5 text-sm">
        {SAMPLE_WORKSPACE_SUMMARY.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />{item}</li>)}
      </ul>
      <div>
        <span className={trackClass}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Loading sample workspace…" : "Load sample workspace"}</button></span>
      </div>
      {state.status === "error" && <FormFeedback status="error" message={state.message} />}
    </form>
  );
}
