import { ArrowLeft } from "lucide-react";

import { getConstructionProjectWorkspace } from "@/features/platform/projects/data";
import { PortalInbox } from "@/features/portal/components/PortalInbox";
import { MerchantMark } from "@/features/portal/components/MerchantMark";
import { getPortalInbox } from "@/features/portal/data";
import { Empty, Pill, Status, Track, readableStatus, statusDot } from "@/features/storefront/components/ui";

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
  const project = workspace.project;
  return (
    <main>
      <header className="sf-pagehead">
        <div className="sf-wrap">
          <div className="sf-back"><Track><Pill href="/portal" variant="raised" size="sm"><ArrowLeft />Your projects</Pill></Track></div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
            <MerchantMark className="size-10" logoIcon={project.logoIcon} logoColor={project.logoColor} brandColor={project.brandColor} initials={project.brandMark || project.companyName.slice(0, 2).toUpperCase()} />
            <p className="sf-kicker">{project.projectNumber} · {project.brandName || project.companyName}</p>
          </div>
          <div className="sf-pagehead__row" style={{ marginTop: "0.9rem" }}>
            <h1 className="sf-display sf-h1" style={{ marginTop: 0 }}>{project.name}</h1>
            <Status tone={statusDot(project.status)}>{readableStatus(project.status)}</Status>
          </div>
        </div>
      </header>
      <section className="sf-section">
        <div className="sf-wrap sf-stack sf-stack--lg">
          <nav aria-label="Portal project tools">
            <Track scroll>
              {portalTools.map(entry => <Pill key={entry.slug} href={`/portal/projects/${encodeURIComponent(projectId)}/${entry.slug}`} variant="quiet" size="sm" current={entry.slug === selectedTool}>{entry.label}</Pill>)}
            </Track>
          </nav>

          {workspace.audience === "external" && <PortalInbox projectId={projectId} items={visibleInbox} />}

          <section aria-labelledby="shared-work-title" className="sf-stack">
            <div className="sf-panel__head" style={{ marginBottom: 0 }}>
              <h2 id="shared-work-title" className="sf-panel__title">Shared records <span className="sf-mono sf-small">{workspace.items.length}</span></h2>
              <span className="sf-small sf-mono">{new Date(workspace.generatedAt).toLocaleString()}</span>
            </div>
            {workspace.items.length === 0 ? <Empty title="No shared records here" /> : (
              <ul className="sf-list">
                {workspace.items.map(item => (
                  <li key={`${item.kind}:${item.id}`} className="sf-list__item sf-list__item--split">
                    <span className="sf-stack" style={{ gap: "0.25rem" }}>
                      <span className="sf-list__ref">{item.kind} · {item.reference}</span>
                      <span className="sf-list__title">{item.title}<Status tone={statusDot(item.status)}>{readableStatus(item.status)}</Status></span>
                      {item.owner && <span className="sf-small">{item.owner}</span>}
                    </span>
                    {item.dueAt ? <span className="sf-small sf-mono">{new Date(item.dueAt).toLocaleDateString()}</span> : <span />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
