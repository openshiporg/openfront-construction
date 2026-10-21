import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/features/dashboard/components/PageContainer";
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
import type { ResourceLogRegisterPage } from "../data";
import { CommandPanel } from "./CommandPanel";
import { WorkflowPanel } from "./WorkflowPanel";
import { TransitionControl } from "./TransitionControl";
import { MetricList } from "./MetricList";
import { ListPager } from "./ListPager";
import { TeamMemberPanel } from "./TeamMemberPanel";
import type { BidComparisonRow, ConstructionOption, InspectionRegisterPage, MaterialReceiptRegisterPage, ProcurementBidInvitationRegisterPage, ProcurementCommitmentRegisterPage, ProcurementLienWaiverRegisterPage, ProcurementRequestRegisterPage, RfiRegisterPage, SafetyIncidentRegisterPage, SafetyObservationRegisterPage, SubmittalRegisterPage, Workspace } from "../data";
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

const projectTools: Array<{ title: string; slug: string }> = projectToolNavigation
  .map(group => [...group.items])
  .flat();

function formatMinor(value: string, currency: string) {
  try {
    const minor = BigInt(value);
    const sign = minor < 0 ? "-" : "";
    const absolute = minor < 0 ? -minor : minor;
    return `${sign}${currency} ${(absolute / BigInt(100)).toLocaleString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch {
    return `${currency} —`;
  }
}

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
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

  const header = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{project.companyName}</span><span aria-hidden>·</span><span>{project.projectNumber}</span>
          <Badge variant="outline">{readable(project.status)}</Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{copy.title}</h1>

      </div>
      <p className="text-xs text-muted-foreground">As of {new Date(workspace.generatedAt).toLocaleString()}</p>
    </div>
  );

  return (
    <PageContainer
      title={copy.title}
      header={header}
      breadcrumbs={[
        { type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" },
        { type: "link", label: project.name, href: projectToolHref(project.id, "") },
        { type: "page", label: copy.title },
      ]}
    >
      <nav aria-label="Project tools" className="overflow-x-auto border-b px-4 md:px-6">
        <div className="my-2 flex min-w-max gap-1 rounded-lg bg-muted p-1">
          {projectTools.map(entry => {
            const href = projectToolHref(project.id, entry.slug);
            const active = entry.slug === (tool === "overview" ? "" : tool);
            return (
              <Link key={entry.slug} href={href} aria-current={active ? "page" : undefined} className={`rounded-md px-3 py-2 text-sm ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {entry.title}
              </Link>
            );
          })}
        </div>
      </nav>

      {tool === "overview" && <MetricList metrics={workspace.metrics} label="Project summary" />}
      {tool === "overview" && workspace.availableCommands.includes("transitionProjectStatus") && <section className="border-b p-4 md:px-6" aria-label="Project status">
        <h2 className="mb-3 text-sm font-medium">{project.name} · {readable(project.status)}</h2>
        <TransitionControl key={project.status} projectId={project.id} item={{ id: project.id, kind: "Project", reference: project.projectNumber, title: project.name, status: project.status, dueAt: null, owner: "", amountMinor: null, allowedTransitions: [...(lifecyclePolicies.Project[project.status as keyof typeof lifecyclePolicies.Project] ?? [])] }} />
      </section>}

      {tool === "field" && resourceUnavailable && <p role="status" className="border-b p-4 text-sm text-muted-foreground">Resource observations are unavailable for your current project role.</p>}
      {tool === "field" && resourceRegister && <ResourceLogRegister projectId={project.id} register={resourceRegister} searchParams={searchParams} />}
      {tool === "field" && resourceRegister && workspace.availableCommands.includes("recordResourceActivity") && <ResourceActivityPanel projectId={project.id} options={options} currencyCode={project.currencyCode} scope={resourceRegister.intentScope} />}
      {tool === "preconstruction" && <BidComparison rows={bidComparison} />}
      {authorizedCapture && authorizedCapture.options.length > 0 && <CommandPanel projectId={project.id} recordOptions={options} {...authorizedCapture} />}
      <WorkflowPanel tool={tool} projectId={project.id} availableCommands={workspace.availableCommands} options={options} />
      {tool === "documents" && workspace.audience === "internal" && <ControlledFilesPanel projectId={project.id} options={options} canManage={workspace.availableCommands.includes("registerDocument")} />}
      {["financials", "contracts", "billing"].includes(tool) && <ApprovalPanel projectId={project.id} options={options} canConfigure={workspace.availableCommands.includes("configureConstructionApprovalPolicy")} />}
      {tool === "quality-safety" && workspace.availableCommands.includes("recordSafetyIncidentPrivateDetails") && <PrivateIncidentPanel options={options} />}
      {tool === "quality-safety" && incidentRegister && <IncidentRegister projectId={project.id} register={incidentRegister} inspectionPage={registerNavigation.inspectionPage} inspectionStatus={registerNavigation.inspectionStatus} observationPage={registerNavigation.observationPage} observationStatus={registerNavigation.observationStatus} />}
      {tool === "quality-safety" && inspectionRegister && <InspectionRegister projectId={project.id} register={inspectionRegister} incidentPage={registerNavigation.incidentPage} incidentStatus={registerNavigation.incidentStatus} observationPage={registerNavigation.observationPage} observationStatus={registerNavigation.observationStatus} />}
      {tool === "quality-safety" && observationRegister && <ObservationRegister projectId={project.id} register={observationRegister} inspectionPage={registerNavigation.inspectionPage} inspectionStatus={registerNavigation.inspectionStatus} incidentPage={registerNavigation.incidentPage} incidentStatus={registerNavigation.incidentStatus} />}
      {tool === "execution" && rfiRegister && <RfiRegister projectId={project.id} register={rfiRegister} submittalPage={registerNavigation.submittalPage} submittalStatus={registerNavigation.submittalStatus} />}
      {tool === "execution" && submittalRegister && <SubmittalRegister projectId={project.id} register={submittalRegister} rfiPage={registerNavigation.rfiPage} rfiStatus={registerNavigation.rfiStatus} />}
      {tool === "team" && workspace.availableCommands.includes("inviteProjectMember") && <TeamMemberPanel projectId={project.id} options={options} />}
      {tool === "team" && workspace.availableCommands.includes("inviteProjectMember") && <InvitationControl options={options} />}
      {tool === "audit" && project.companyId && workspace.availableCommands.includes("issueApiCredential") && <ApiCredentialPanel companyId={project.companyId} projectId={project.id} options={options} />}
      {tool === "procurement" && procurementRegister && <ProcurementRequestsRegister projectId={project.id} register={procurementRegister} searchParams={searchParams} />}
      {tool === "procurement" && materialReceiptRegister && <MaterialReceiptsRegister projectId={project.id} register={materialReceiptRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementCommitmentRegister && <ProcurementCommitmentsRegister projectId={project.id} register={procurementCommitmentRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementBidInvitationRegister && <BidInvitationsRegister projectId={project.id} register={procurementBidInvitationRegister} searchParams={searchParams} />}
      {tool === "procurement" && procurementLienWaiverRegister && <LienWaiversRegister projectId={project.id} register={procurementLienWaiverRegister} searchParams={searchParams} />}
      <section className="px-4 py-6 md:px-6" aria-labelledby="work-queue-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="work-queue-title" className="text-base font-semibold">{tool === "reports" ? "Project records" : "Work queue"}</h2>
            <p className="text-sm text-muted-foreground">{queueGroups.length === 0 ? "No records." : queueGroups.map(group => `${group.kind}: ${group.totalCount}`).join(" · ")}{tool !== "reports" && queueGroups.length > 0 ? " — most recently updated first within each type." : ""}</p>
          </div>
          {tool === "reports" && workspace.audience === "internal" ? (
            <ReportExportButton projectName={project.name} generatedAt={workspace.generatedAt} currencyCode={project.currencyCode} items={items} groups={workspace.queueGroups} />
          ) : (
            <ListPager label="Work queue pages" page={workspace.queuePage} totalPages={workspace.queueTotalPages} hrefFor={next => queueHref(project.id, tool, searchParams, next)} />
          )}
        </div>

        {queueItems.length === 0 ? (
          <div className="border-y py-12 text-center">
            <p className="font-medium">No records in this queue</p>

          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {queueItems.map(entry => (
                <article key={`${entry.kind}:${entry.id}`} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs text-muted-foreground">{entry.kind} · {entry.reference}</p>{workspace.audience === "internal" && detailHref(project.id, entry.kind, entry.id) ? <Link href={detailHref(project.id, entry.kind, entry.id)!} className="mt-1 inline-flex items-center gap-1 font-medium hover:underline">{entry.title}<ArrowUpRight className="h-3.5 w-3.5" /></Link> : <h3 className="mt-1 font-medium">{entry.title}</h3>}</div>
                    <Badge variant="outline">{readable(entry.status)}</Badge>
                  </div>
                  <div className="my-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <span>{entry.owner}</span><span className="text-right">{entry.dueAt ? new Date(entry.dueAt).toLocaleDateString() : "No due date"}</span>
                    {entry.amountMinor && <span className="col-span-2 text-sm tabular-nums text-foreground">{formatMinor(entry.amountMinor, project.currencyCode)}</span>}
                  </div>
                  <TransitionControl projectId={project.id} item={entry} />
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto border-y md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Record</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Ball in court</th><th className="px-3 py-2 font-medium">Due</th><th className="px-3 py-2 font-medium">Value</th><th className="px-3 py-2 font-medium">Next action</th></tr></thead>
                <tbody className="divide-y">
                  {queueItems.map(entry => (
                    <tr key={`${entry.kind}:${entry.id}`} className="align-top">
                      <td className="px-3 py-3"><p className="text-xs text-muted-foreground">{entry.kind} · {entry.reference}</p>{workspace.audience === "internal" && detailHref(project.id, entry.kind, entry.id) ? <Link href={detailHref(project.id, entry.kind, entry.id)!} className="mt-0.5 inline-flex items-center gap-1 font-medium hover:underline">{entry.title}<ArrowUpRight className="h-3.5 w-3.5" /></Link> : <p className="mt-0.5 font-medium">{entry.title}</p>}</td>
                      <td className="px-3 py-3"><Badge variant="outline">{readable(entry.status)}</Badge></td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.owner}</td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.dueAt ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(entry.dueAt).toLocaleDateString()}</span> : "—"}</td>
                      <td className="px-3 py-3 tabular-nums">{entry.amountMinor ? formatMinor(entry.amountMinor, project.currencyCode) : "—"}</td>
                      <td className="px-3 py-3"><TransitionControl projectId={project.id} item={entry} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {workspace.audience === "internal" && (
          <Link href="/dashboard/projects" className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Project model <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </section>
    </PageContainer>
  );
}
