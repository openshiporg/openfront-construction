import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getConstructionProjectWorkspace } from "@/features/platform/projects/data";
import { PortalInbox } from "@/features/portal/components/PortalInbox";
import { MerchantMark } from "@/features/portal/components/MerchantMark";
import { getPortalInbox } from "@/features/portal/data";

const portalTools = [
  { slug: "overview", label: "Overview" },
  { slug: "preconstruction", label: "Bids" },
  { slug: "execution", label: "RFIs & submittals" },
  { slug: "documents", label: "Documents" },
  { slug: "billing", label: "Billing & waivers" },
  { slug: "schedule", label: "Schedule" },
  { slug: "field", label: "Field updates" },
  { slug: "quality-safety", label: "Quality & safety" },
] as const;

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export async function PortalProjectPage({ projectId, tool = "overview" }: { projectId: string; tool?: string }) {
  const selectedTool = portalTools.some(entry => entry.slug === tool) ? tool : "overview";
  const workspace = await getConstructionProjectWorkspace(projectId, selectedTool);
  const inbox = workspace.audience === "external" ? await getPortalInbox(projectId) : [];
  const actionGroups: Record<string, string[]> = {
    preconstruction: ["submit_bid"], execution: ["respond_rfi", "review_submittal", "decide_approval"],
    documents: ["ack_document", "download_document", "download_drawing"], billing: ["submit_claim", "submit_waiver", "decide_approval"],
  };
  const visibleInbox = selectedTool === "overview" ? inbox : inbox.filter(item => (actionGroups[selectedTool] ?? []).includes(item.action));
  if (workspace.audience !== "external") {
    // Internal users may preview the portal, but this surface never renders financial fields.
    workspace.items = workspace.items.map(item => ({ ...item, amountMinor: null, allowedTransitions: [] }));
  }
  return (
    <main className="mx-auto min-h-svh max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header>
        <Link href="/portal" className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:text-foreground">Your projects</Link>
        <div className="mt-4 flex flex-col gap-3 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3"><MerchantMark className="size-10" logoIcon={workspace.project.logoIcon} logoColor={workspace.project.logoColor} brandColor={workspace.project.brandColor} initials={workspace.project.brandMark || workspace.project.companyName.slice(0, 2).toUpperCase()} /><div><p className="text-xs text-muted-foreground">{workspace.project.brandName} · {workspace.project.projectNumber}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.project.name}</h1></div></div>
          <Badge variant="outline">{readable(workspace.project.status)}</Badge>
        </div>
      </header>
      <nav aria-label="Portal project tools" className="overflow-x-auto border-b"><div className="flex min-w-max gap-1 py-3">{portalTools.map(entry => <Link key={entry.slug} href={`/portal/projects/${encodeURIComponent(projectId)}/${entry.slug}`} aria-current={entry.slug === selectedTool ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm ${entry.slug === selectedTool ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>{entry.label}</Link>)}</div></nav>
      <section className="py-7" aria-labelledby="shared-work-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="shared-work-title" className="font-semibold">Shared project records</h2><p className="mt-1 text-sm text-muted-foreground">{workspace.items.length} records</p></div><p className="text-xs text-muted-foreground">As of {new Date(workspace.generatedAt).toLocaleString()}</p></div>
        {workspace.items.length === 0 ? <div className="mt-5 border-y py-12 text-center text-sm text-muted-foreground">No shared records in this area.</div> : <div className="mt-5 grid gap-3">{workspace.items.map(item => <article key={`${item.kind}:${item.id}`} className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs text-muted-foreground">{item.kind} · {item.reference}</p><h3 className="mt-1 font-medium">{item.title}</h3><p className="mt-2 text-xs text-muted-foreground">{item.owner}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{readable(item.status)}</Badge>{item.dueAt && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.dueAt).toLocaleDateString()}</span>}</div></article>)}</div>}
      </section>
      {workspace.audience === "external" && <PortalInbox projectId={projectId} items={visibleInbox} />}
    </main>
  );
}
