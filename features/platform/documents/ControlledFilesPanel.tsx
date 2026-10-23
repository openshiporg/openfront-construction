'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { FormEvent, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FolderLock, Upload } from "lucide-react";

import type { ConstructionOption } from "@/features/platform/projects/data";
import { localDateTimeToInstant, userTimeZone } from "@/features/platform/projects/components/workflow-fields";
import { completeControlledUpload, distributeControlledDocument, getControlledDownload, requestControlledUpload } from "./actions";
import { EmptyState, FormFeedback, Panel, StatusDot, fieldLabelClass, inputClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";

const MAX_BYTES = 50 * 1024 * 1024;
const subscribeToNothing = () => () => {};

type UploadRequestData = {
  projectId: string;
  parentId: string;
  sequence: string;
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  kind: "document" | "drawing";
};

type PendingUploadRetry = {
  request: UploadRequestData;
  file: File;
  requestKey: string;
  itemId?: string;
  completionKey?: string;
};

async function sha256(file: File) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
}

export function ControlledFilesPanel({ projectId, options, canManage }: { projectId: string; options: ConstructionOption[]; canManage: boolean }) {
  const router = useRouter();
  const timeZone = useSyncExternalStore(subscribeToNothing, userTimeZone, () => "");
  const [kind, setKind] = useState<"document" | "drawing">("document");
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [retryableUpload, setRetryableUpload] = useState<PendingUploadRetry | null>(null);
  const [pending, startTransition] = useTransition();
  const parents = options.filter(option => option.kind === kind);
  const downloads = options.filter(option => option.kind === (kind === "document" ? "documentVersion" : "drawingRevision") && (option.kind !== "drawingRevision" || option.status === "issued" || option.status === "superseded"));
  const issuedMessage = (fileKind: "document" | "drawing") => `${fileKind === "drawing" ? "Drawing revision" : "Document version"} uploaded and issued.`;

  async function attemptUpload(retry: PendingUploadRetry) {
    setStatus(null);
    try {
      if (retry.itemId && retry.completionKey) {
        const completedReservation = await completeControlledUpload({ kind: retry.request.kind, itemId: retry.itemId, idempotencyKey: retry.completionKey });
        if (completedReservation.success) {
          setRetryableUpload(null);
          setStatus({ tone: "success", message: issuedMessage(retry.request.kind) });
          router.refresh();
          return;
        }
      }
      const authorization = await requestControlledUpload({ ...retry.request, idempotencyKey: retry.requestKey });
      if (!authorization.success) return setStatus({ tone: "error", message: authorization.error });
      const completionKey = retry.completionKey ?? authorization.authorization.completionKey;
      const resumedReservation = { ...retry, itemId: authorization.authorization.itemId, completionKey };
      setRetryableUpload(resumedReservation);
      const uploadResponse = await fetch(authorization.authorization.uploadUrl, {
        method: "PUT",
        headers: Object.fromEntries(authorization.authorization.headers.map(header => [header.name, header.value])),
        body: retry.file,
        redirect: "error",
      });
      if (!uploadResponse.ok) return setStatus({ tone: "error", message: `The upload failed (${uploadResponse.status}). The file was not issued; retry to send it again.` });
      const completed = await completeControlledUpload({ kind: retry.request.kind, itemId: authorization.authorization.itemId, idempotencyKey: completionKey });
      if (!completed.success) return setStatus({ tone: "error", message: completed.error });
      setRetryableUpload(null);
      setStatus({ tone: "success", message: issuedMessage(retry.request.kind) });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Upload failed" });
    }
  }

  function retryUpload() {
    const retry = retryableUpload;
    if (!retry) return;
    startTransition(async () => attemptUpload(retry));
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (retryableUpload) return setStatus({ tone: "error", message: "Retry the pending upload before starting another one." });
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || file.size < 1) return setStatus({ tone: "error", message: "Choose a file to upload." });
    if (file.size > MAX_BYTES) return setStatus({ tone: "error", message: "Files are limited to 50 MB." });
    if (!file.type) return setStatus({ tone: "error", message: "The selected file does not report an allowed media type." });
    startTransition(async () => {
      try {
        const retry: PendingUploadRetry = {
          request: {
            projectId,
            parentId: String(data.get("parentId") || ""),
            sequence: String(data.get("sequence") || ""),
            title: String(data.get("title") || ""),
            fileName: file.name,
            mimeType: file.type,
            byteSize: file.size,
            checksumSha256: await sha256(file),
            kind,
          },
          file,
          requestKey: crypto.randomUUID(),
        };
        setRetryableUpload(retry);
        await attemptUpload(retry);
      } catch (error) {
        setStatus({ tone: "error", message: error instanceof Error ? error.message : "Upload failed" });
      }
    });
  }

  async function download(itemId: string) {
    setStatus(null);
    startTransition(async () => {
      const result = await getControlledDownload(kind, itemId);
      if (!result.success) return setStatus({ tone: "error", message: result.error });
      window.location.assign(result.url);
    });
  }

  async function distribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await distributeControlledDocument({
        projectId,
        versionId: String(data.get("versionId") || ""),
        membershipId: String(data.get("membershipId") || ""),
        purpose: String(data.get("purpose") || ""),
        expiresAt: localDateTimeToInstant(String(data.get("expiresAt") || "")),
      });
      setStatus(result.success ? { tone: "success", message: "Document shared with the selected project member." } : { tone: "error", message: result.error });
      if (result.success) router.refresh();
    });
  }

  return (
    <Panel id="controlled-files" title="Controlled files" icon={FolderLock} padded={false} actions={
      <div role="radiogroup" aria-label="Record type" className={trackClass}>
        {(["document", "drawing"] as const).map(value => <button key={value} type="button" role="radio" aria-checked={kind === value} disabled={pending || Boolean(retryableUpload)} onClick={() => setKind(value)} className={pillClass(kind === value ? "raised" : "quiet", "sm")}>{value === "document" ? "Documents" : "Drawings"}</button>)}
      </div>
    }>
      <div className={`grid ${canManage ? "lg:grid-cols-2 lg:divide-x" : ""}`}>
        {canManage && <form onSubmit={upload} className="grid min-w-0 content-start gap-4 p-4 md:grid-cols-2 md:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground md:col-span-2">Issue {kind === "drawing" ? "a drawing revision" : "a document version"}</h3>
          <label className={`${fieldLabelClass} md:col-span-2`}>{kind === "drawing" ? "Drawing" : "Document"}<FormSelect name="parentId" required defaultValue="" className={selectClass}><option value="">Select…</option>{parents.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
          <label className={fieldLabelClass}>{kind === "drawing" ? "Revision" : "Version number"}<input name="sequence" required type={kind === "document" ? "number" : "text"} min={kind === "document" ? 1 : undefined} className={`${inputClass} font-mono`} /></label>
          <label className={fieldLabelClass}>Issued title<input name="title" required maxLength={300} className={inputClass} /></label>
          <label className={`${fieldLabelClass} md:col-span-2`}>File<input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.docx,.xlsx" className={`${inputClass} h-auto min-h-10 py-2 file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium`} /></label>
          <span className={`${trackClass} md:col-span-2`}><button type="submit" disabled={pending || Boolean(retryableUpload) || parents.length === 0} className={pillClass("primary")}><Upload />{pending ? "Uploading…" : "Upload and issue"}</button></span>
        </form>}
        <div className="min-w-0 p-4 md:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Issued {kind === "drawing" ? "drawings" : "documents"}</h3>
          {downloads.length ? <ul className="mt-3 divide-y overflow-hidden rounded-lg border">{downloads.map(option => <li key={option.id} className="flex items-center justify-between gap-3 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{option.label}</p><p className="truncate text-xs text-muted-foreground">{option.detail}</p></div><span className={trackClass}><button type="button" disabled={pending} onClick={() => download(option.id)} className={pillClass("raised", "sm")}><Download />Download</button></span></li>)}</ul> : <div className="mt-3"><EmptyState compact title={`No issued ${kind === "drawing" ? "drawings" : "documents"}`} /></div>}
        </div>
      </div>
      {retryableUpload && (
        <div className="flex flex-col gap-3 border-t bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20 md:flex-row md:items-center md:justify-between md:px-5">
          <p className="flex items-center gap-2 text-sm"><StatusDot tone="amber" />Not issued: {retryableUpload.request.kind === "drawing" ? "drawing revision" : "document version"} {retryableUpload.request.sequence} ({retryableUpload.request.fileName})</p>
          <span className={trackClass}><button type="button" disabled={pending} onClick={retryUpload} className={pillClass("primary", "sm")}>Retry upload</button></span>
        </div>
      )}
      {canManage && kind === "document" && (
        <form onSubmit={distribute} className="grid min-w-0 gap-4 border-t p-4 md:grid-cols-2 md:p-5 lg:grid-cols-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground md:col-span-2 lg:col-span-4">Share a version</h3>
          <label className={fieldLabelClass}>Issued version<FormSelect name="versionId" required defaultValue="" className={selectClass}><option value="">Select…</option>{options.filter(option => option.kind === "documentVersion").map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
          <label className={fieldLabelClass}>Recipient<FormSelect name="membershipId" required defaultValue="" className={selectClass}><option value="">Select…</option>{options.filter(option => option.kind === "membership").map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
          <label className={fieldLabelClass}>Purpose<input name="purpose" required maxLength={500} className={inputClass} /></label>
          <label className={fieldLabelClass}>Expires{timeZone ? ` (${timeZone})` : ""}<input name="expiresAt" type="datetime-local" className={inputClass} /></label>
          <span className={`${trackClass} md:col-span-2 lg:col-span-4`}><button type="submit" disabled={pending} className={pillClass("primary")}>Share version</button></span>
        </form>
      )}
      {status && <FormFeedback status={status.tone} message={status.message} className="border-t px-4 py-3 md:px-5" />}
    </Panel>
  );
}
