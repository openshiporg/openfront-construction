import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { projectToolHref } from "@/features/platform/lib/navigation";
import { TransitionControl } from "../components/TransitionControl";
import { getConstructionRecordDetail, type ConstructionRecordEvidence } from "../data";
import { transitionKindByListKey } from "../transition-kinds";

function readable(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }
function listLabel(listKey: string) { return transitionKindByListKey[listKey] ?? listKey.replace(/([a-z])([A-Z])/g, "$1 $2"); }

export async function ProjectRecordDetailPage({ projectId, recordType, recordId }: { projectId: string; recordType: string; recordId: string }) {
  let detail;
  try { detail = await getConstructionRecordDetail(projectId, recordType, recordId); }
  catch (error) { if (error instanceof Error && /not found|does not have/i.test(error.message)) notFound(); throw error; }
  const kind = transitionKindByListKey[detail.listKey];
  return <PageContainer title={detail.title} breadcrumbs={[{ type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" }, { type: "link", label: "Project", href: projectToolHref(projectId, "") }, { type: "page", label: detail.reference || detail.title }]} header={<div><p className="text-xs text-muted-foreground">{listLabel(detail.listKey)} · {detail.reference}</p><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{detail.title}</h1><Badge variant="outline">{readable(detail.status)}</Badge></div></div>}>
    {kind && detail.allowedTransitions.length > 0 && <section className="border-b px-4 py-4 md:px-6" aria-label="Status"><h2 className="mb-3 text-sm font-medium">Change status</h2><TransitionControl key={detail.status} projectId={projectId} item={{ id: detail.id, kind, reference: detail.reference, title: detail.title, status: detail.status, dueAt: null, owner: "", amountMinor: null, allowedTransitions: detail.allowedTransitions }} /></section>}
    <section className="grid border-b sm:grid-cols-2 lg:grid-cols-3" aria-label="Record details">{detail.fields.length ? detail.fields.map(field => <div key={field.label} className="border-b p-4 sm:border-r md:p-5"><p className="text-xs font-medium text-muted-foreground">{field.label}</p><p className="mt-2 whitespace-pre-wrap text-sm">{field.value}</p></div>) : <p className="p-6 text-sm text-muted-foreground">No additional details.</p>}</section>
    <section className="px-4 py-6 md:px-6" aria-labelledby="evidence-title"><h2 id="evidence-title" className="font-semibold">Related records</h2><EvidenceList projectId={projectId} items={detail.evidence} empty="No related records." /></section>
    <section className="border-t px-4 py-6 md:px-6" aria-labelledby="history-title"><h2 id="history-title" className="font-semibold">History</h2><EvidenceList projectId={projectId} items={detail.history} empty="No history available." /></section>
  </PageContainer>;
}

function EvidenceList({ projectId, items, empty }: { projectId: string; items: ConstructionRecordEvidence[]; empty: string }) {
  if (!items.length) return <div className="mt-4 border-y py-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return <div className="mt-4 divide-y border-y">{items.map((entry, index) => <article key={`${entry.kind}:${entry.reference}:${index}`} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs text-muted-foreground">{entry.kind}{entry.reference ? ` · ${entry.reference}` : ""}</p>{entry.recordType && entry.recordId ? <Link href={`${projectToolHref(projectId, "")}/records/${entry.recordType}/${encodeURIComponent(entry.recordId)}`} className="mt-1 inline-flex whitespace-pre-wrap text-sm font-medium hover:underline">{entry.title}</Link> : <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{entry.title}</p>}</div><div className="flex items-center gap-3"><Badge variant="outline">{readable(entry.status)}</Badge>{entry.occurredAt && <span className="text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString()}</span>}</div></article>)}</div>;
}
