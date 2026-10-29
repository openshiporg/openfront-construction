'use client';

import { useActionState } from "react";
import { FormFeedback, Track, pillClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { installStripeProviderAction, toggleProviderAction } from "./actions";

export function InstallStripe({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(installStripeProviderAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return <form action={action} className="flex flex-wrap items-center gap-3"><input type="hidden" name="companyId" value={companyId} /><Track><button disabled={pending} className={pillClass("primary", "sm")}>{pending ? "Adding…" : "Add Stripe"}</button></Track><FormFeedback status={state.status} message={state.message} /></form>;
}

export function ToggleProvider({ providerId, isInstalled }: { providerId: string; isInstalled: boolean }) {
  const [state, action, pending] = useActionState(toggleProviderAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return <form action={action} className="flex flex-wrap items-center gap-3"><input type="hidden" name="providerId" value={providerId} /><input type="hidden" name="isInstalled" value={String(!isInstalled)} /><Track><button disabled={pending} className={pillClass("raised", "sm")}>{isInstalled ? "Turn off" : "Turn on"}</button></Track><FormFeedback status={state.status} message={state.status === "error" ? state.message : ""} /></form>;
}
