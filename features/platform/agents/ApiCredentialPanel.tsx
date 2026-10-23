'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { initialCommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { OneTimeSecretReceipt } from "@/features/platform/projects/components/OneTimeSecretReceipt";
import { FormFeedback, Panel, fieldLabelClass, inputClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";
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
    <form action={action} className="grid gap-4 p-4 md:grid-cols-2 md:p-5">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="projectId" value={projectId} />
      <label className={fieldLabelClass}>Credential name<input name="name" required minLength={3} maxLength={160} className={inputClass} /></label>
      <label className={fieldLabelClass}>Expires (optional)<input name="expiresAt" type="datetime-local" className={inputClass} /></label>
      <fieldset className="grid gap-2 md:col-span-2">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">Scopes (1–12)</legend>
        <div className="flex flex-wrap gap-2">
          {scopes.map(scope => (
            <label key={scope} className="inline-flex cursor-pointer items-center gap-2 rounded-full border bg-background px-3 py-1.5 font-mono text-[11px] has-[:checked]:border-foreground has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <input type="checkbox" name="scopes" value={scope} className="size-3.5 accent-foreground" />{scope}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Issuing…" : "Issue API key"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
      <div className="md:col-span-2"><OneTimeSecretReceipt state={state} /></div>
    </form>
  );
}

function Revoke({ options }: { options: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(revokeCredentialAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  const credentials = options.filter(option => option.kind === "apiCredential" && option.detail.startsWith("active"));

  return (
    <form action={action} className="grid gap-4 border-t p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end md:p-5">
      <label className={fieldLabelClass}>Active credential<FormSelect name="credentialId" required defaultValue="" className={selectClass}><option value="">Select…</option>{credentials.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Reason<input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
      <span className={trackClass}><button type="submit" disabled={pending || !credentials.length} className={pillClass("danger")}>{pending ? "Revoking…" : "Revoke"}</button></span>
      <FormFeedback status={state.status} message={state.message} className="md:col-span-3" />
    </form>
  );
}

export function ApiCredentialPanel({ companyId, projectId, options }: { companyId: string; projectId: string; options: ConstructionOption[] }) {
  return <Panel id="api-credentials" title="API keys" icon={KeyRound} padded={false}><Issue companyId={companyId} projectId={projectId} /><Revoke options={options} /></Panel>;
}
