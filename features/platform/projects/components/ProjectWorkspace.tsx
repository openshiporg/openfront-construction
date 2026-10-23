import Link from "next/link";
import { ArrowUpRight, CalendarDays, Database, ListChecks } from "lucide-react";

import { projectToolHref, projectToolNavigation } from "@/features/platform/lib/navigation";
import { ReportExportButton } from "@/features/platform/reports/ReportExportButton";
import { ControlledFilesPanel } from "@/features/platform/documents/ControlledFilesPanel";
import { ApprovalPanel } from "@/features/platform/approvals/ApprovalPanel";
import { PrivateIncidentPanel } from "@/features/platform/quality-safety/PrivateIncidentPanel";
import { InvitationControl } from "@/features/platform/team/InvitationControl";
import { ApiCredentialPanel } from "@/features/platform/agents/ApiCredentialPanel";
import { BidComparison } from "@/features/platform/preconstruction/BidComparison";
import { MaterialReceiptsRegister } from "@/features/platform/procurement/MaterialReceiptsRegister";
import { ProcurementCommitmentsRegister } from "@/features/platform/procurement/ProcurementCommitmentsRegister";
import { BidInvitationsRegister } from "@/features/platform/procurement/BidInvitationsRegister";
import { LienWaiversRegister } from "@/features/platform/procurement/LienWaiversRegister";
import { ProcurementRequestsRegister } from "@/features/platform/procurement/ProcurementRequestsRegister";
import { IncidentRegister } from "@/features/platform/quality-safety/IncidentRegister";
import { InspectionRegister } from "@/features/platform/quality-safety/InspectionRegister";
import { ObservationRegister } from "@/features/platform/quality-safety/ObservationRegister";
import { RfiRegister } from "@/features/platform/execution/RfiRegister";
import { SubmittalRegister } from "@/features/platform/execution/SubmittalRegister";
import { ResourceLogRegister } from "@/features/platform/field/ResourceLogRegister";
import { ResourceActivityPanel } from "@/features/platform/field/ResourceActivityPanel";
import { EmptyState, PageHeader, Panel, PillLink, PlatformPage, StatusDot, TitleStatus, Track, formatDate, formatMinor, isOverdue, pillClass, trackClass } from "@/features/platform/components/kit";
import type { ResourceLogRegisterPage } from "../data";
import { CommandPanel } from "./CommandPanel";
import { WorkflowPanel } from "./WorkflowPanel";
import { TransitionControl } from "./TransitionControl";
import { MetricList } from "./MetricList";
import { ListPager } from "./ListPager";
import { TeamMemberPanel } from "./TeamMemberPanel";
import type { BidComparisonRow, ConstructionOption, InspectionRegisterPage, MaterialReceiptRegisterPage, ProcurementBidInvitationRegisterPage, ProcurementCommitmentRegisterPage, ProcurementLienWaiverRegisterPage, ProcurementRequestRegisterPage, RfiRegisterPage, SafetyIncidentRegisterPage, SafetyObservationRegisterPage, SubmittalRegisterPage, Workspace, WorkItem } from "../data";
import { lifecyclePolicies } from "@/features/keystone/domain/lifecycle";
import { workspaceDefinitions } from "../workspace-definitions";

function queueHref(projectId: string, tool: string, searchParams: Record<string, string | string[] | undefined> | undefined, page: number) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams ?? {})) {
    if (raw === undefined || key === "queuePage") continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) query.append(key, value);
  }
  if (page > 1) query.set("queuePage", String(page));
  const base = projectToolHref(projectId, tool === "overview" ? "" : tool);
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

type RegisterNavigationState = {
  inspectionPage: number;
  inspectionStatus: string;
  incidentPage: number;
  incidentStatus: string;
  observationPage: number;
  observationStatus: string;
  rfiPage: number;
  rfiStatus: string;
  submittalPage: number;
  submittalStatus: string;
};

const detailTypes: Record<string, string> = {
  Resource: "resource-log", "Material / equipment activity": "resource-log",
  RFI: "rfi", Submittal: "submittal", "Daily log": "daily-log", Estimate: "estimate",
  "Bid package": "bid-package", "Bid submission": "bid-submission", "Prime contract": "prime-contract",
  Commitment: "commitment", "Subcontract / PO": "subcontract-po", "Change order": "change-order",
  "Procurement request": "procurement-request", "Material receipt": "material-receipt", Inspection: "inspection", Incident: "incident",
  Punch: "punch", Observation: "observation", "Corrective action": "corrective-action", "Progress claim": "progress-claim", Payment: "payment",
  "Retainage release": "retainage-release", "Lien waiver": "lien-waiver",
  Document: "document", Drawing: "drawing", Schedule: "schedule", "Schedule task": "schedule-task",
};
function detailHref(projectId: string, kind: string, recordId: string) {
  const recordType = detailTypes[kind];
  return recordType ? `/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/${recordType}/${encodeURIComponent(recordId)}` : null;
}

/** Tool tabs: the three project phases share one track, separated by a hairline. */
function ProjectTools({ projectId, active }: { projectId: string; active: string }) {
  return (
    <nav aria-label="Project tools" className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className={`${trackClass} max-w-none`}>
        {projectToolNavigation.map((group, index) => (
          <div key={group.title} role="group" aria-label={group.title} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" /> : null}
            {group.items.map(entry => {
              const current = entry.slug === active;
              return <Link key={entry.slug} href={projectToolHref(projectId, entry.slug)} aria-current={current ? "page" : undefined} className={pillClass(current ? "raised" : "quiet", "sm")}>{entry.title}</Link>;
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

function QueueTitle({ projectId, entry, internal }: { projectId: string; entry: WorkItem; internal: boolean }) {
  const href = internal ? detailHref(projectId, entry.kind, entry.id) : null;
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{entry.kind} · {entry.reference}</p>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {href ? <Link href={href} className="inline-flex min-w-0 items-center gap-1 break-words text-sm font-medium underline-offset-4 hover:underline">{entry.title}<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /></Link> : <span className="min-w-0 break-words text-sm font-medium">{entry.title}</span>}
        <TitleStatus status={entry.status} />
      </div>
    </div>
  );
}

function DueDate({ value, status }: { value: string | null; status: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const late = isOverdue(value) && !["closed", "completed", "approved", "voided", "cancelled", "paid", "settled", "archived"].includes(status);
  return <span className={`inline-flex items-center gap-1 tabular-nums ${late ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}><CalendarDays className="size-3.5" aria-hidden="true" />{formatDate(value)}</span>;
}

export function ProjectWorkspace({ resourceRegister, resourceUnavailable, workspace, options, bidComparison = [], procurementRegister, materialReceiptRegister, procurementCommitmentRegister, procurementBidInvitationRegister, procurementLienWaiverRegister, inspectionRegister, incidentRegister, observationRegister, submittalRegister, rfiRegister, registerNavigation, searchParams = {} }: {
  resourceRegister?: ResourceLogRegisterPage;
  resourceUnavailable?: boolean;
  workspace: Workspace;
  options: ConstructionOption[];
  bidComparison?: BidComparisonRow[];
  procurementRegister?: ProcurementRequestRegisterPage;
  materialReceiptRegister?: MaterialReceiptRegisterPage;
  procurementCommitmentRegister?: ProcurementCommitmentRegisterPage;
  procurementBidInvitationRegister?: ProcurementBidInvitationRegisterPage;
  procurementLienWaiverRegister?: ProcurementLienWaiverRegisterPage;
  inspectionRegister?: InspectionRegisterPage;
  incidentRegister?: SafetyIncidentRegisterPage;
  observationRegister?: SafetyObservationRegisterPage;
  submittalRegister?: SubmittalRegisterPage;
  rfiRegister?: RfiRegisterPage;
  registerNavigation: RegisterNavigationState;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { project, tool, items } = workspace;
  const internal = workspace.audience === "internal";
  // Kinds with a dedicated paged register are shown there instead of the queue.
  const inQueue = (kind: string) =>
    (tool !== "field" || (!resourceRegister && !resourceUnavailable) || kind !== "Resource") &&
    (!procurementRegister || kind !== "Procurement request") &&
    (!materialReceiptRegister || kind !== "Material receipt") &&
    (tool !== "procurement" || !procurementCommitmentRegister || kind !== "Subcontract / PO") &&
    (tool !== "procurement" || !procurementBidInvitationRegister || kind !== "Bid invitation") &&
    (tool !== "procurement" || !procurementLienWaiverRegister || kind !== "Payment readiness") &&
    (!inspectionRegister || kind !== "Inspection") &&
    (!incidentRegister || kind !== "Incident") &&
    (!observationRegister || kind !== "Observation") &&
    (!submittalRegister || kind !== "Submittal") &&
    (!rfiRegister || kind !== "RFI");
  const queueItems = items.filter(entry => inQueue(entry.kind));
  const queueGroups = workspace.queueGroups.filter(group => inQueue(group.kind));
  const copy = workspaceDefinitions[tool] ?? workspaceDefinitions.overview;
  const capture = copy.command;
  const authorizedCapture = capture
    ? { ...capture, options: capture.options.filter(option => workspace.availableCommands.includes(option.value)) }
    : null;
  const activeSlug = tool === "overview" ? "" : tool;
  const dates = [project.startDate && `Start ${formatDate(project.startDate)}`, project.completionDate && `Finish ${formatDate(project.completionDate)}`].filter(Boolean).join(" → ");

  return (
    <PlatformPage breadcrumbs={[
      { type: "link", label: "Portfolio", href: "/platform/portfolio" },
      { type: "link", label: project.name, href: `/platform/projects/${encodeURIComponent(project.id)}` },
      { type: "page", label: copy.title },
    ]}>
      <PageHeader
        eyebrow={<><span>{project.projectNumber}</span><span aria-hidden="true">·</span><span>{project.companyName}</span></>}
        title={project.name}
        status={<TitleStatus status={project.status} />}
        meta={<>{dates ? <span className="tabular-nums">{dates}</span> : null}<span className="tabular-nums">As of {new Date(workspace.generatedAt).toLocaleString()}</span></>}
        actions={<>
          {tool === "reports" && internal ? <ReportExportButton projectName={project.name} generatedAt={workspace.generatedAt} currencyCode={project.currencyCode} items={items} groups={workspace.queueGroups} /> : null}
          {internal ? <Track><PillLink href="/dashboard/projects" size="sm"><Database />Data</PillLink></Track> : null}
        </>}
      />

      <ProjectTools projectId={project.id} active={activeSlug} />

      {tool === "overview" && <MetricList metrics={workspace.metrics} label="Project summary" />}
      {tool === "overview" && workspace.availableCommands.includes("transitionProjectStatus") && (
        <Panel id="project-status" title="Project status" actions={<TitleStatus status={project.status} />}>
          <div className="max-w-md">
            <TransitionControl key={project.status} projectId={project.id} item={{ id: project.id, kind: "Project", reference: project.projectNumber, title: project.name, status: project.status, dueAt: null, owner: "", amountMinor: null, allowedTransitions: [...(lifecyclePolicies.Project[project.status as keyof typeof lifecyclePolicies.Project] ?? [])] }} />
          </div>
        </Panel>
      )}

      {tool === "field" && resourceUnavailable && <p role="status" className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-muted-foreground"><StatusDot tone="zinc" />Equipment and material activity is not available for your project role</p>}
      {tool === "field" && resourceRegister && <ResourceLogRegister projectId={project.id} register={resourceRegister} searchParams={searchParams} />}
      {tool === "preconstruction" && <BidComparison rows={bidComparison} />}
      {tool === "documents" && internal && <ControlledFilesPanel projectId={project.id} options={options} canManage={workspace.availableCommands.includes("registerDocument")} />}
      {["financials", "contracts", "billing"].includes(tool) && <ApprovalPanel projectId={project.id} options={options} canConfigure={workspace.availableCommands.includes("configureConstructionApprovalPolicy")} />}
      {tool === "quality-safety" && incidentRegister && <IncidentRegister projectId={project.id} register={incidentRegister} inspectionPage={registerNavigation.inspectionPage} inspectionStatus={registerNavigation.inspectionStatus} observationPage={registerNavigation.observationPage} observationStatus={registerNavigation.observationStatus} />}
      {tool === "quality-safety" && inspectionRegister && <InspectionRegister projectId={project.id} register={inspectionRegister} incidentPage={registerNavigation.incidentPage} incidentStatus={registerNavigation.incidentStatus} observationPage={registerNavigation.observationPage} observationStatus={registerNavigation.observationStatus} />}
      {tool === "quality-safety" && observationRegister && <ObservationRegister projectId={project.id} register={observationRegister} inspectionPage={registerNavigation.inspectionPage} inspectionStatus={registerNavigation.inspectionStatus} incidentPage={registerNavigation.incidentPage} incidentStatus={registerNavigation.incidentStatus} />}
      {tool === "quality-safety" && workspace.availableCommands.includes("recordSafetyIncidentPrivateDetails") && <PrivateIncidentPanel options={options} />}
      {tool === "execution" && rfiRegister && <RfiRegister projectId={project.id} register={rfiRegister} submittalPage={registerNavigation.submittalPage} submittalStatus={registerNavigation.submittalStatus} />}
      {tool === "execution" && submittalRegister && <SubmittalRegister projectId={project.id} register={submittalRegister} rfiPage={registerNavigation.rfiPage} rfiStatus={registerNavigation.rfiStatus} />}
      {tool === "procurement" && procurementRegister && <ProcurementRequestsRegister projectId={project.id} register={procurementRegister} searchParams={searchParams} />}
      {tool === "procurement" && materialReceiptRegister && <MaterialReceiptsRegister projectId={project.id} register={materialReceiptRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementCommitmentRegister && <ProcurementCommitmentsRegister projectId={project.id} register={procurementCommitmentRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementBidInvitationRegister && <BidInvitationsRegister projectId={project.id} register={procurementBidInvitationRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementLienWaiverRegister && <LienWaiversRegister projectId={project.id} register={procurementLienWaiverRegister} searchParams={searchParams} />}

      <Panel
        id="work-queue"
        icon={ListChecks}
        title={tool === "reports" ? "Project records" : tool === "overview" ? "Open work" : `${copy.title} queue`}
        meta={queueGroups.length ? queueGroups.map(group => `${group.kind} ${group.totalCount}`).join(" · ") : undefined}
        actions={tool === "reports" ? undefined : <ListPager label="Work queue pages" page={workspace.queuePage} totalPages={workspace.queueTotalPages} hrefFor={next => queueHref(project.id, tool, searchParams, next)} />}
        padded={false}
      >
        {queueItems.length === 0 ? (
          <div className="p-4 md:p-5"><EmptyState compact title="Nothing in this queue" /></div>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {queueItems.map(entry => (
                <li key={`${entry.kind}:${entry.id}`} className="grid gap-3 px-4 py-4">
                  <QueueTitle projectId={project.id} entry={entry} internal={internal} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{entry.owner || "Unassigned"}</span>
                    <DueDate value={entry.dueAt} status={entry.status} />
                  </div>
                  {entry.amountMinor && <p className="text-sm font-semibold tabular-nums">{formatMinor(entry.amountMinor, project.currencyCode)}</p>}
                  <TransitionControl projectId={project.id} item={entry} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.06em] text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Record</th><th className="px-4 py-2 font-medium">Ball in court</th><th className="px-4 py-2 font-medium">Due</th><th className="px-4 py-2 text-right font-medium">Value</th><th className="px-4 py-2 font-medium">Next step</th></tr></thead>
                <tbody className="divide-y">
                  {queueItems.map(entry => (
                    <tr key={`${entry.kind}:${entry.id}`} className="align-top transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3"><QueueTitle projectId={project.id} entry={entry} internal={internal} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.owner || "—"}</td>
                      <td className="px-4 py-3"><DueDate value={entry.dueAt} status={entry.status} /></td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{entry.amountMinor ? formatMinor(entry.amountMinor, project.currencyCode) : "—"}</td>
                      <td className="px-4 py-3"><TransitionControl projectId={project.id} item={entry} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <WorkflowPanel tool={tool} projectId={project.id} availableCommands={workspace.availableCommands} options={options} />
      {authorizedCapture && authorizedCapture.options.length > 0 && <CommandPanel projectId={project.id} recordOptions={options} {...authorizedCapture} />}
      {tool === "field" && resourceRegister && workspace.availableCommands.includes("recordResourceActivity") && <ResourceActivityPanel projectId={project.id} options={options} currencyCode={project.currencyCode} scope={resourceRegister.intentScope} />}
      {tool === "team" && workspace.availableCommands.includes("inviteProjectMember") && <TeamMemberPanel projectId={project.id} options={options} />}
      {tool === "team" && workspace.availableCommands.includes("inviteProjectMember") && <InvitationControl options={options} />}
      {tool === "audit" && project.companyId && workspace.availableCommands.includes("issueApiCredential") && <ApiCredentialPanel companyId={project.companyId} projectId={project.id} options={options} />}
    </PlatformPage>
  );
}
