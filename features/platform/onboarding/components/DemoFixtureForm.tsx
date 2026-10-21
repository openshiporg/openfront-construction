"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SAMPLE_WORKSPACE_SUMMARY } from "@/features/keystone/domain/onboarding-manifest";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import { loadDemoFixtureAction } from "../actions/onboarding";

/** The fictional sample workspace. It submits a normal onboarding request
 * (onboardConstructionWorkspace), and every record stays labelled fictional. */
export function DemoFixtureForm({ onComplete }: { onComplete?(state: CommandState): void }) {
  const [state, action, pending] = useActionState(loadDemoFixtureAction, initialCommandState);
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (state.status === "success") onComplete?.(state);
  }, [state, onComplete]);
  return (
    <form action={action} className="grid gap-4 rounded-lg border border-dashed p-4 md:p-5" aria-labelledby="demo-fixture-title">
      <input type="hidden" name="idempotencyKey" value={key} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Mock data</span>
        <h2 id="demo-fixture-title" className="font-semibold">Northstar Builders · Civic Learning Center</h2>
      </div>
      <p className="text-sm text-muted-foreground">Fictional company, client and project. Not a real contractor, owner or job.</p>
      <ul className="grid gap-1.5 text-sm">
        {SAMPLE_WORKSPACE_SUMMARY.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span>{item}</li>)}
      </ul>
      <div>
        <Button type="submit" disabled={pending} className="min-h-11">{pending ? "Loading sample workspace…" : "Load sample workspace"}</Button>
      </div>
      {state.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
