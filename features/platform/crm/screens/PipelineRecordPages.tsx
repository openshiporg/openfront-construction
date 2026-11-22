import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Inbox, Mail, Phone, UserRound } from "lucide-react";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { Fact, NotFoundPage, PageHeader, Panel, PillLink, PlatformPage, TitleStatus, Track, formatDate, formatMinor, readable } from "@/features/platform/components/kit";
import { LeadForm, PursuitForm } from "../components/RecordForms";

/** Pursuit, lead and website-inquiry pages: what a business-development lead reads and acts on,
 * instead of the raw database form. */

const pursuitStages = [
  { value: "qualifying", label: "Qualifying" }, { value: "go_no_go", label: "Go / no-go" }, { value: "estimating", label: "Estimating" },
  { value: "submitted", label: "Submitted" }, { value: "negotiating", label: "Negotiating" }, { value: "won", label: "Won" },
  { value: "lost", label: "Lost" }, { value: "declined", label: "Declined" },
];
const leadStatuses = [
  { value: "new", label: "New" }, { value: "qualified", label: "Qualified" }, { value: "nurturing", label: "Nurturing" },
  { value: "converted", label: "Converted" }, { value: "disqualified", label: "Disqualified" },
];
const stageLabel = (stage: string) => pursuitStages.find(entry => entry.value === stage)?.label ?? readable(stage);
const back = <Track><PillLink href="/dashboard/platform/pipeline"><ArrowLeft />Pipeline</PillLink></Track>;
const crumbs = (label: string) => [{ type: "link" as const, label: "Pipeline", href: "/platform/pipeline" }, { type: "page" as const, label }];

type Pursuit = {
  id: string; number: string; name: string; organization: string; deliveryMethod: string; locationSummary: string; stage: string;
  estimatedValueMinor: string; currencyCode: string; probabilityBps: number; targetBidDate: string | null; expectedAwardDate: string | null;
  nextActionAt: string | null; notes: string; owner: { name: string } | null; client: { name: string } | null;
  lead: { id: string; name: string; email: string } | null; createdAt: string;
};

export async function OpportunityItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await keystoneClient<{ constructionOpportunity: Pursuit | null; serviceRequests: Array<{ id: string; reference: string; status: string }> }>(`
    query Pursuit($id: ID!) {
      constructionOpportunity(where: { id: $id }) {
        id number name organization deliveryMethod locationSummary stage estimatedValueMinor currencyCode probabilityBps
        targetBidDate expectedAwardDate nextActionAt notes createdAt owner { name } client { name } lead { id name email }
      }
      serviceRequests(where: { opportunity: { id: { equals: $id } } }, take: 5) { id reference status }
    }
  `, { id });
  const pursuit = response.success ? response.data.constructionOpportunity : null;
  if (!pursuit) return <NotFoundPage title="Pursuit" backHref="/dashboard/platform/pipeline" backLabel="Pipeline" />;
  const closed = ["won", "lost", "declined"].includes(pursuit.stage);
  const requests = response.success ? response.data.serviceRequests ?? [] : [];
  return (
    <PlatformPage breadcrumbs={crumbs(pursuit.number || "Pursuit")} width="narrow">
      <PageHeader icon={BriefcaseBusiness} eyebrow={<>{pursuit.number}{pursuit.organization ? <span>· {pursuit.organization}</span> : null}</>} title={pursuit.name} status={<TitleStatus status={pursuit.stage} label={stageLabel(pursuit.stage)} />} actions={back} />
      <Panel title="Pursuit">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label="Estimated value">{formatMinor(pursuit.estimatedValueMinor, pursuit.currencyCode, { whole: true })}</Fact>
          <Fact label="Win probability">{Math.round(pursuit.probabilityBps / 100)}%</Fact>
          <Fact label="Owner">{pursuit.owner?.name || "Unassigned"}</Fact>
          <Fact label="Bid date">{formatDate(pursuit.targetBidDate) || "Not set"}</Fact>
          <Fact label="Expected award">{formatDate(pursuit.expectedAwardDate) || "Not set"}</Fact>
          <Fact label="Next action">{formatDate(pursuit.nextActionAt) || "Not set"}</Fact>
          <Fact label="Client">{pursuit.client?.name || "Not set"}</Fact>
          <Fact label="Delivery method">{pursuit.deliveryMethod || "Not set"}</Fact>
          <Fact label="Location">{pursuit.locationSummary || "Not set"}</Fact>
        </dl>
        {pursuit.lead ? <p className="mt-4 text-sm text-muted-foreground">From lead <Link className="font-medium text-foreground underline underline-offset-4" href={`/dashboard/platform/pipeline/leads/${pursuit.lead.id}`}>{pursuit.lead.name || pursuit.lead.email}</Link></p> : null}
        {requests.map(request => <p key={request.id} className="mt-2 text-sm text-muted-foreground">Quote request <Link className="font-medium text-foreground underline underline-offset-4" href="/dashboard/platform/service-requests">{request.reference}</Link> · {readable(request.status)}</p>)}
        {pursuit.notes ? <p className="mt-4 whitespace-pre-line break-words text-sm">{pursuit.notes}</p> : null}
      </Panel>
      {closed
        ? <p className="text-sm text-muted-foreground">This pursuit is {stageLabel(pursuit.stage).toLowerCase()} and closed.</p>
        : <Panel title="Update"><PursuitForm pursuit={pursuit} stages={pursuitStages} /></Panel>}
    </PlatformPage>
  );
}

type Lead = {
  id: string; name: string; organization: string; email: string; phone: string; source: string; status: string; notes: string;
  nextActionAt: string | null; createdAt: string; owner: { name: string } | null;
  opportunities: Array<{ id: string; number: string; name: string; stage: string }>;
};

export async function LeadItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await keystoneClient<{ constructionLead: Lead | null }>(`
    query Lead($id: ID!) {
      constructionLead(where: { id: $id }) {
        id name organization email phone source status notes nextActionAt createdAt owner { name }
        opportunities(take: 20, orderBy: [{ createdAt: desc }]) { id number name stage }
      }
    }
  `, { id });
  const lead = response.success ? response.data.constructionLead : null;
  if (!lead) return <NotFoundPage title="Lead" backHref="/dashboard/platform/pipeline" backLabel="Pipeline" />;
  return (
    <PlatformPage breadcrumbs={crumbs(lead.name || "Lead")} width="narrow">
      <PageHeader icon={UserRound} eyebrow={<>Lead · {readable(lead.source)}</>} title={lead.name || lead.email} status={<TitleStatus status={lead.status} />} actions={back} />
      <Panel title="Contact">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label="Organization">{lead.organization || "Not set"}</Fact>
          <Fact label="Email">{lead.email ? <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 md:min-h-0" href={`mailto:${lead.email}`}><Mail className="size-3.5" />{lead.email}</a> : "Not set"}</Fact>
          <Fact label="Phone">{lead.phone ? <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 md:min-h-0" href={`tel:${lead.phone}`}><Phone className="size-3.5" />{lead.phone}</a> : "Not set"}</Fact>
          <Fact label="Owner">{lead.owner?.name || "Unassigned"}</Fact>
          <Fact label="Next action">{formatDate(lead.nextActionAt) || "Not set"}</Fact>
          <Fact label="Added">{formatDate(lead.createdAt)}</Fact>
        </dl>
        {lead.notes ? <p className="mt-4 whitespace-pre-line break-words text-sm">{lead.notes}</p> : null}
      </Panel>
      <Panel title="Pursuits" meta={`${lead.opportunities.length} from this lead`} padded={false}>
        {lead.opportunities.length === 0
          ? <p className="p-4 text-sm text-muted-foreground">None yet. <Link className="font-medium text-foreground underline underline-offset-4" href="/dashboard/platform/pipeline/create">New pursuit</Link></p>
          : <ul className="divide-y">{lead.opportunities.map(item => <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <span className="text-xs text-muted-foreground">{item.number}</span>
            <Link className="text-sm font-medium underline-offset-4 hover:underline" href={`/dashboard/platform/pipeline/${item.id}`}>{item.name}</Link>
            <TitleStatus status={item.stage} label={stageLabel(item.stage)} />
          </li>)}</ul>}
      </Panel>
      {lead.status === "converted"
        ? <p className="text-sm text-muted-foreground">This lead is converted and closed.</p>
        : <Panel title="Update"><LeadForm lead={lead} statuses={leadStatuses} /></Panel>}
    </PlatformPage>
  );
}

type Inquiry = {
  id: string; publicReference: string; kind: string; status: string; contactName: string; organization: string; email: string; phone: string;
  contactRole: string; projectName: string; projectType: string; locationSummary: string; deliveryMethod: string; budgetRange: string;
  desiredStart: string | null; desiredCompletion: string | null; designStage: string; servicesSought: string; scopeSummary: string;
  referralSource: string; submittedAt: string; lead: { id: string; name: string } | null; opportunity: { id: string; number: string; name: string } | null;
};

export async function PublicRequestItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await keystoneClient<{ intakeSubmission: Inquiry | null }>(`
    query Inquiry($id: ID!) {
      intakeSubmission(where: { id: $id }) {
        id publicReference kind status contactName organization email phone contactRole projectName projectType locationSummary deliveryMethod
        budgetRange desiredStart desiredCompletion designStage servicesSought scopeSummary referralSource submittedAt
        lead { id name } opportunity { id number name }
      }
    }
  `, { id });
  const item = response.success ? response.data.intakeSubmission : null;
  if (!item) return <NotFoundPage title="Website inquiry" backHref="/dashboard/platform/pipeline" backLabel="Pipeline" />;
  const facts: Array<[string, string]> = [
    ["Project type", item.projectType], ["Location", item.locationSummary], ["Delivery method", item.deliveryMethod], ["Budget", item.budgetRange],
    ["Desired start", formatDate(item.desiredStart)], ["Desired completion", formatDate(item.desiredCompletion)], ["Design stage", item.designStage],
    ["Services sought", item.servicesSought], ["Heard about us", item.referralSource],
  ];
  return (
    <PlatformPage breadcrumbs={crumbs(item.publicReference)} width="narrow">
      <PageHeader icon={Inbox} eyebrow={<>{item.publicReference} · {readable(item.kind)} · {formatDate(item.submittedAt)}</>} title={item.projectName || item.organization || item.contactName} actions={back} />
      <Panel title="From">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label="Name">{item.contactName}{item.contactRole ? `, ${item.contactRole}` : ""}</Fact>
          <Fact label="Email">{item.email ? <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 md:min-h-0" href={`mailto:${item.email}`}><Mail className="size-3.5" />{item.email}</a> : "Not given"}</Fact>
          <Fact label="Phone">{item.phone ? <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 md:min-h-0" href={`tel:${item.phone}`}><Phone className="size-3.5" />{item.phone}</a> : "Not given"}</Fact>
          {item.organization ? <Fact label="Organization">{item.organization}</Fact> : null}
        </dl>
        {item.lead ? <p className="mt-4 text-sm text-muted-foreground">Lead <Link className="font-medium text-foreground underline underline-offset-4" href={`/dashboard/platform/pipeline/leads/${item.lead.id}`}>{item.lead.name}</Link></p> : null}
        {item.opportunity ? <p className="mt-1 text-sm text-muted-foreground">Pursuit <Link className="font-medium text-foreground underline underline-offset-4" href={`/dashboard/platform/pipeline/${item.opportunity.id}`}>{item.opportunity.number} {item.opportunity.name}</Link></p> : null}
      </Panel>
      <Panel title="Project">
        {item.scopeSummary ? <p className="whitespace-pre-line break-words text-sm">{item.scopeSummary}</p> : null}
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">{facts.filter(([, v]) => v).map(([label, v]) => <Fact key={label} label={label}>{v}</Fact>)}</dl>
      </Panel>
      {!item.opportunity ? <Track><PillLink href="/dashboard/platform/pipeline/create" variant="primary">Start a pursuit</PillLink></Track> : null}
    </PlatformPage>
  );
}
