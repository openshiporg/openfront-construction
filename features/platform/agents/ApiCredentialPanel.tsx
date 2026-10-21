'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialCommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { OneTimeSecretReceipt } from "@/features/platform/projects/components/OneTimeSecretReceipt";
import { issueCredentialAction, revokeCredentialAction } from "./actions";

const scopes = [
  "companies:read", "companies:write", "projects:read", "projects:write",
  "preconstruction:read", "preconstruction:write", "financials:read", "financials:write",
  "contracts:read", "contracts:write", "execution:read", "execution:write",
  "documents:read", "documents:write", "field:read", "field:write",
  "safety:read", "safety:write", "billing:read", "billing:write",
  "agents:read", "agents:write", "audit:read",
];

function Issue({ companyId, projectId }: { companyId: string; projectId: string }) {
  const [state, action, pending] = useActionState(issueCredentialAction, initialCommandState);
  useRefreshOnSuccess(state.status);

  return (
    <form action={action} className="grid gap-3 p-4 md:grid-cols-2 md:p-6">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="projectId" value={projectId} />
      <label className="grid gap-1 text-xs font-medium">Credential name<Input name="name" required minLength={3} maxLength={160} /></label>
      <label className="grid gap-1 text-xs font-medium">Expires at (optional)<Input name="expiresAt" type="datetime-local" /></label>
      <fieldset className="grid gap-2 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-xs font-medium">Narrow scopes (1–12)</legend>
        {scopes.map(scope => <label key={scope} className="flex items-center gap-2 text-xs"><input type="checkbox" name="scopes" value={scope} />{scope}</label>)}
      </fieldset>
      <Button disabled={pending} className="md:col-span-2">{pending ? "Issuing…" : "Issue project-scoped API key"}</Button>
      {state.message && <p role="status" className={`text-sm md:col-span-2 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}
      <div className="md:col-span-2"><OneTimeSecretReceipt state={state} /></div>
    </form>
  );
}

function Revoke({ options }: { options: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(revokeCredentialAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  const credentials = options.filter(option => option.kind === "apiCredential" && option.detail.startsWith("active"));

  return (
    <form action={action} className="grid gap-3 border-t p-4 md:grid-cols-[1fr_2fr_auto] md:p-6">
      <label className="grid gap-1 text-xs font-medium">Active credential<FormSelect name="credentialId" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{credentials.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
      <label className="grid gap-1 text-xs font-medium">Revocation reason<Input name="reason" required minLength={3} maxLength={500} /></label>
      <div className="flex items-end"><Button type="submit" variant="outline" disabled={pending || !credentials.length}>{pending ? "Revoking…" : "Revoke"}</Button></div>
      {state.message && <p role="status" className={`text-sm md:col-span-3 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}
    </form>
  );
}

export function ApiCredentialPanel({ companyId, projectId, options }: { companyId: string; projectId: string; options: ConstructionOption[] }) {
  return <section className="overflow-hidden rounded-xl border bg-card"><div className="p-4 md:p-6"><h2 className="font-semibold">Scoped API credentials</h2><p className="mt-1 text-sm text-muted-foreground">Tokens are shown once.</p></div><Issue companyId={companyId} projectId={projectId} /><Revoke options={options} /></section>;
}
