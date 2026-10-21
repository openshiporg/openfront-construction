'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { FormEvent, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { localDateTimeToInstant, userTimeZone } from "@/features/platform/projects/components/workflow-fields";
import { completeControlledUpload, distributeControlledDocument, getControlledDownload, requestControlledUpload } from "./actions";

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
    <section className="border-y bg-muted/15" aria-labelledby="controlled-files-title">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-5 md:px-6">
        <h2 id="controlled-files-title" className="text-base font-semibold">Files</h2>
        {!canManage && <label className="grid gap-1.5 text-xs font-medium">Record type<FormSelect value={kind} disabled={pending} onValueChange={nextValue => setKind(nextValue as "document" | "drawing")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="document">Documents</option><option value="drawing">Drawings</option></FormSelect></label>}
      </div>
      <div className={`grid border-t ${canManage ? "lg:grid-cols-2" : ""}`}>
        {canManage && <form onSubmit={upload} className="grid min-w-0 gap-3 p-4 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 md:grid-cols-2 md:p-6 lg:border-r">
          <label className="grid gap-1.5 text-xs font-medium">Record type<FormSelect value={kind} disabled={pending || Boolean(retryableUpload)} onValueChange={nextValue => setKind(nextValue as "document" | "drawing")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="document">Document version</option><option value="drawing">Drawing revision</option></FormSelect></label>
          <label className="grid gap-1.5 text-xs font-medium">{kind === "drawing" ? "Drawing" : "Document"}<FormSelect name="parentId" required defaultValue="" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select…</option>{parents.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
          <label className="grid gap-1.5 text-xs font-medium">{kind === "drawing" ? "Revision" : "Version number"}<Input name="sequence" required type={kind === "document" ? "number" : "text"} min={kind === "document" ? 1 : undefined} /></label>
          <label className="grid gap-1.5 text-xs font-medium">Issued title<Input name="title" required maxLength={300} /></label>
          <label className="grid gap-1.5 text-xs font-medium md:col-span-2">File<Input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.docx,.xlsx" /></label>
          <Button type="submit" disabled={pending || Boolean(retryableUpload) || parents.length === 0} className="md:col-span-2"><Upload className="mr-2 h-4 w-4" />{pending ? "Uploading…" : "Upload and issue"}</Button>
        </form>}
        <div className="p-4 md:p-6">
          <h3 className="text-sm font-semibold">Issued {kind === "drawing" ? "drawings" : "documents"}</h3>
          <div className="mt-3 divide-y border-y">{downloads.length ? downloads.map(option => <div key={option.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{option.label}</p><p className="text-xs text-muted-foreground">{option.detail}</p></div><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => download(option.id)}><Download className="mr-1 h-3.5 w-3.5" />Download</Button></div>) : <p className="py-6 text-center text-sm text-muted-foreground">No issued files are available.</p>}</div>
        </div>
      </div>
      {retryableUpload && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-sm text-muted-foreground">{retryableUpload.request.kind === "drawing" ? "Drawing revision" : "Document version"} {retryableUpload.request.sequence} ({retryableUpload.request.fileName}) has not been issued yet.</p>
          <Button type="button" disabled={pending} onClick={retryUpload}>Retry upload</Button>
        </div>
      )}
      {canManage && kind === "document" && (
        <form onSubmit={distribute} className="grid min-w-0 gap-3 border-t p-4 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 md:grid-cols-2 lg:grid-cols-5 md:p-6">
          <label className="grid gap-1.5 text-xs font-medium">Issued version<FormSelect name="versionId" required defaultValue="" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select…</option>{options.filter(option => option.kind === "documentVersion").map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
          <label className="grid gap-1.5 text-xs font-medium">Recipient<FormSelect name="membershipId" required defaultValue="" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select…</option>{options.filter(option => option.kind === "membership").map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
          <label className="grid gap-1.5 text-xs font-medium lg:col-span-2">Distribution purpose<Input name="purpose" required maxLength={500} /></label>
          <label className="grid gap-1.5 text-xs font-medium">Expires (optional{timeZone ? `, ${timeZone}` : ""})<Input name="expiresAt" type="datetime-local" /></label>
          <Button type="submit" disabled={pending} className="md:col-span-2 lg:col-span-5">Share selected version</Button>
        </form>
      )}
      {status && <p role={status.tone === "error" ? "alert" : "status"} className={`border-t px-4 py-3 text-sm md:px-6 ${status.tone === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{status.message}</p>}
    </section>
  );
}
