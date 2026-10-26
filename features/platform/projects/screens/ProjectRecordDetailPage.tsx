import Link from "next/link";
import { ArrowLeft, History, Link2 } from "lucide-react";

import { projectToolHref } from "@/features/platform/lib/navigation";
import { EmptyState, NotFoundPage, PageHeader, Panel, PillLink, PlatformPage, TitleStatus, Track } from "@/features/platform/components/kit";
import { TransitionControl } from "../components/TransitionControl";
import { getConstructionRecordDetail, type ConstructionRecordEvidence } from "../data";
import { transitionKindByListKey } from "../transition-kinds";

function listLabel(listKey: string) { return transitionKindByListKey[listKey] ?? listKey.replace(/([a-z])([A-Z])/g, "$1 $2"); }

export async function ProjectRecordDetailPage({ projectId, recordType, recordId }: { projectId: string; recordType: string; recordId: string }) {
  let detail;
  try { detail = await getConstructionRecordDetail(projectId, recordType, recordId); }
  catch (error) {
    if (error instanceof Error && /not found|does not have/i.test(error.message)) {
      return <NotFoundPage title="Record not found" backHref={projectToolHref(projectId, "")} backLabel="Project" />;
    }
    throw error;
  }
  const kind = transitionKindByListKey[detail.listKey];
  return (
    <PlatformPage width="narrow" breadcrumbs={[
      { type: "link", label: "Portfolio", href: "/platform/portfolio" },
      { type: "link", label: "Project", href: `/platform/projects/${encodeURIComponent(projectId)}` },
      { type: "page", label: detail.reference || detail.title },
    ]}>
      <PageHeader
        eyebrow={<><span>{listLabel(detail.listKey)}</span>{detail.reference ? <><span aria-hidden="true">·</span><span>{detail.reference}</span></> : null}</>}
        title={detail.title}
        status={<TitleStatus status={detail.status} />}
        actions={<Track><PillLink href={projectToolHref(projectId, "")} size="sm"><ArrowLeft />Project</PillLink></Track>}
      />
      {kind && detail.allowedTransitions.length > 0 && (
        <Panel id="record-status" title="Next step">
          <div className="max-w-md">
            <TransitionControl key={detail.status} projectId={projectId} item={{ id: detail.id, kind, reference: detail.reference, title: detail.title, status: detail.status, dueAt: null, owner: "", amountMinor: null, allowedTransitions: detail.allowedTransitions }} />
          </div>
        </Panel>
      )}
      <Panel id="record-details" title="Details" padded={false}>
        {detail.fields.length
          ? <dl className="grid sm:grid-cols-2">{detail.fields.map(field => <div key={field.label} className="min-w-0 border-b px-4 py-3 sm:odd:border-r md:px-5"><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{field.value}</dd></div>)}</dl>
          : <div className="p-4 md:p-5"><EmptyState compact title="No additional details" /></div>}
      </Panel>
      <Panel id="evidence" title="Related records" icon={Link2} padded={false}><EvidenceList projectId={projectId} items={detail.evidence} empty="No related records" /></Panel>
      <Panel id="history" title="History" icon={History} padded={false}><EvidenceList projectId={projectId} items={detail.history} empty="No history" timeline /></Panel>
    </PlatformPage>
  );
}

function EvidenceList({ projectId, items, empty, timeline = false }: { projectId: string; items: ConstructionRecordEvidence[]; empty: string; timeline?: boolean }) {
  if (!items.length) return <div className="p-4 md:p-5"><EmptyState compact title={empty} /></div>;
  return (
    <ol className={timeline ? "relative grid gap-0 px-4 py-2 md:px-5" : "divide-y"}>
      {items.map((entry, index) => (
        <li key={`${entry.kind}:${entry.reference}:${index}`} className={timeline ? "relative grid gap-1 border-l py-3 pl-5" : "grid gap-1 px-4 py-3 md:px-5"}>
          {timeline ? <span aria-hidden="true" className="absolute -left-[5px] top-[18px] size-2.5 rounded-full border-2 border-background bg-muted-foreground/60" /> : null}
          <p className="text-xs text-muted-foreground">{entry.kind}{entry.reference ? ` · ${entry.reference}` : ""}{entry.occurredAt ? ` · ${new Date(entry.occurredAt).toLocaleString()}` : ""}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {entry.recordType && entry.recordId
              ? <Link href={`${projectToolHref(projectId, "")}/records/${entry.recordType}/${encodeURIComponent(entry.recordId)}`} className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium underline-offset-4 hover:underline">{entry.title}</Link>
              : <span className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium">{entry.title}</span>}
            <TitleStatus status={entry.status} />
          </div>
        </li>
      ))}
    </ol>
  );
}
