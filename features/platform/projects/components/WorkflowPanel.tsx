'use client';

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/features/forms/components/FormSelect";
import { RecordLookup } from "@/features/forms/components/RecordLookup";
import { sha256Hex, MAX_EVIDENCE_BYTES } from "@/features/forms/lib/sha256";
import type { ConstructionOption } from "../data";
import { runConstructionWorkflow } from "../actions";
import { useKeyedCommand } from "../use-keyed-command";
import { OneTimeSecretReceipt } from "./OneTimeSecretReceipt";
import { eligibleOptions, localDateTimeToInstant, userTimeZone, type Field, type NumberRule } from "./workflow-fields";

type Workflow = { operation: string; label: string; help: string; fields: Field[] };

const MONEY: NumberRule = { step: "0.01", min: "0", inputMode: "decimal" };
const SIGNED_MONEY: NumberRule = { step: "0.01", inputMode: "decimal" };
const QUANTITY: NumberRule = { step: "0.0001", min: "0", inputMode: "decimal" };

const ref = (label: string): Field => ({ name: "reference", label, required: true });
const title = (label: string): Field => ({ name: "title", label, required: true });
const notes = (label = "Notes", required = false): Field => ({ name: "description", label, type: "textarea", required });
const amount = (label: string, signed = false): Field => ({ name: "amount", label, type: "number", required: true, placeholder: "0.00", number: signed ? SIGNED_MONEY : MONEY });
const select = (name: string, label: string, optionKinds: string[], required = true, extra: Partial<Field> = {}): Field => ({ name, label, type: "select", optionKinds, required, ...extra });
const values = (name: string, label: string, entries: string[], required = true): Field => ({ name, label, type: "select", required, values: entries.map(entry => ({ value: entry, label: entry.replaceAll("_", " ") })) });
const quantity = (label = "Quantity", required = false): Field => ({ name: "quantity", label, type: "number", required, number: QUANTITY });
const integer = (label: string, rule: Omit<NumberRule, "step" | "inputMode">, required = true): Field => ({ name: "quantity", label, type: "number", required, number: { step: "1", inputMode: "numeric", ...rule } });
const unit: Field = { name: "unit", label: "Unit" };
const due: Field = { name: "dueAt", label: "Due date", type: "date" };
const occurred = (label = "Date and time"): Field => ({ name: "occurredAt", label, type: "datetime-local" });
const evidence: Field = { name: "evidence", label: "Evidence file", type: "evidence", required: true };

/** Change-order direction follows the selected contract. */
const changeOrderDirection: Field = { name: "type", label: "Direction", derivedFrom: { field: "relatedId", byKind: { primeContract: "owner", commitment: "commitment" } } };

const workflows: Record<string, Workflow[]> = {
  preconstruction: [
    { operation: "registerTradePartner", label: "Add bidding partner", help: "Add an owner, designer, subcontractor, vendor, consultant or authority.", fields: [ref("Partner email"), title("Partner name"), notes("Legal name"), values("type", "Partner type", ["subcontractor", "vendor", "owner", "designer", "consultant", "authority"])] },
    { operation: "createEstimateWithLine", label: "Create estimate", help: "Start a draft estimate with its first line.", fields: [ref("Estimate number"), title("Estimate title"), notes("Scope description", true), amount("Estimated amount"), select("relatedId", "Budget code", ["budgetCode"]), quantity(), unit] },
    { operation: "reviseEstimate", label: "Revise estimate", help: "Start a new draft version of a rejected estimate. The issued version is kept.", fields: [select("relatedId", "Rejected estimate", ["estimate"], true, { statuses: ["rejected"] }), notes("What changes in this revision")] },
    { operation: "inviteBidder", label: "Invite a bidder", help: "Invite a trade partner to bid on a package.", fields: [ref("Recipient email"), title("Recipient name"), select("relatedId", "Bid package", ["bidPackage"]), select("secondaryId", "Budget code", ["budgetCode"]), select("partnerId", "Trade partner", ["partner"])] },
    { operation: "recordBidSubmission", label: "Record received bid", help: "Record a bid received for an open invitation.", fields: [ref("Submission number"), title("Bid scope"), notes("Exclusions and clarifications"), amount("Submitted amount"), select("relatedId", "Bid invitation", ["bidInvitation"], true, { statuses: ["draft", "invited", "viewed", "intent_to_bid"] }), select("secondaryId", "Budget code", ["budgetCode"]), quantity(), unit, occurred("Received")] },
  ],
  financials: [
    { operation: "addBudgetLine", label: "Add budget line", help: "Add a line to the active budget.", fields: [title("Budget line description"), amount("Original budget amount"), select("relatedId", "Budget code", ["budgetCode"])] },
    { operation: "createBudgetChangeWithLine", label: "Create budget revision", help: "Propose a change to an existing budget line for approval.", fields: [ref("Revision number"), title("Revision title"), notes("Revision reason", true), amount("Budget adjustment", true), select("relatedId", "Budget code", ["budgetCode"])] },
    { operation: "reversePostedDirectCost", label: "Reverse posted direct cost", help: "Reverse a posted cost and its budget totals.", fields: [select("relatedId", "Posted direct cost", ["directCost"], true, { statuses: ["posted"] }), notes("Reversal reason", true), occurred("Effective")] },
  ],
  contracts: [
    { operation: "addChangeEventLine", label: "Price change event", help: "Add an estimated cost line to an open change event.", fields: [select("relatedId", "Change event", ["changeEvent"], true, { statuses: ["open", "pricing"] }), title("Line description"), amount("Estimated cost"), select("secondaryId", "Budget code", ["budgetCode"])] },
    { operation: "recordChangeQuote", label: "Record change quote", help: "Record a trade partner's quote for a change event.", fields: [select("relatedId", "Change event", ["changeEvent"], true, { statuses: ["open", "pricing"] }), select("secondaryId", "Change event line (optional)", ["changeEventLine"], false, { parentField: "relatedId" }), select("partnerId", "Trade partner", ["partner"], true, { statuses: ["active"] }), ref("Quote number"), notes("Quoted scope"), amount("Quoted amount"), { name: "dueAt", label: "Valid until", type: "date" }, occurred("Received")] },
    { operation: "createPrimeContractWithLine", label: "Create prime contract", help: "Create an owner contract with its first schedule-of-values line.", fields: [ref("Contract number"), title("Contract title"), notes("Schedule of values scope", true), amount("Contract value"), select("secondaryId", "Budget code", ["budgetCode"]), select("partnerId", "Client", ["partner"]), values("type", "Contract type", ["lump_sum", "gmp", "cost_plus", "unit_price"])] },
    { operation: "createCommitmentWithLine", label: "Create subcontract or PO", help: "Create a subcontract or purchase order with its first line.", fields: [ref("Commitment number"), title("Commitment title"), notes("Schedule of values scope", true), amount("Commitment value"), select("secondaryId", "Budget code", ["budgetCode"]), select("partnerId", "Trade partner", ["partner"]), values("type", "Commitment type", ["subcontract", "purchase_order"])] },
    { operation: "createChangeOrderWithLine", label: "Create change order", help: "Create an owner or subcontract change order for approval.", fields: [ref("Change order number"), title("Change order title"), notes("Change scope", true), amount("Change value", true), select("relatedId", "Contract", ["primeContract", "commitment"]), select("secondaryId", "Budget code", ["budgetCode"]), changeOrderDirection] },
  ],
  execution: [
    { operation: "routeRfi", label: "Route RFI", help: "Assign who answers the RFI next.", fields: [select("relatedId", "RFI", ["rfi"], true, { statuses: ["draft", "open", "answered"] }), select("userId", "Assigned person", ["user"], true, { statuses: ["active"] }), select("partnerId", "Responsible organization (optional)", ["partner"], false), due] },
    { operation: "respondToRfi", label: "Respond to RFI", help: "Add a draft or official response.", fields: [select("relatedId", "RFI", ["rfi"], true, { statuses: ["open", "answered"] }), notes("Response", true), values("type", "Response type", ["draft", "official"]), occurred("Responded")] },
    { operation: "routeSubmittalReview", label: "Route submittal review", help: "Add a reviewer to the submittal's review sequence.", fields: [select("relatedId", "Submittal", ["submittal"], true, { statuses: ["draft", "submitted", "under_review", "revise_resubmit"] }), select("userId", "Reviewer", ["user"], true, { statuses: ["active"] }), select("partnerId", "Reviewer organization (optional)", ["partner"], false), integer("Review order", { min: "1", max: "100" }), due, notes("Routing instructions")] },
    { operation: "recordSubmittalReview", label: "Review submittal", help: "Record your review decision.", fields: [select("relatedId", "Submittal", ["submittal"]), notes("Review response", true), values("type", "Decision", ["approved", "approved_as_noted", "revise_resubmit", "rejected"]), occurred("Reviewed")] },
  ],
  field: [
    { operation: "addDailyLogEntry", label: "Add daily log entry", help: "Add weather, manpower, deliveries, delays, progress, visitors or notes.", fields: [select("relatedId", "Daily log", ["dailyLog"], true, { statuses: ["draft"] }), title("Entry title"), notes("Entry details"), values("type", "Entry type", ["weather", "manpower", "equipment", "delivery", "material", "safety", "inspection", "delay", "progress", "visitor", "note"]), quantity("Quantity or delay days"), unit, occurred("Started")] },
    { operation: "registerFieldPhoto", label: "Add field photo", help: "Attach a photo record to a daily log entry, then upload the file.", fields: [select("relatedId", "Daily log entry", ["dailyLogEntry"], true, { statuses: ["draft"] }), ref("Photo reference"), title("Photo caption"), notes()] },
    { operation: "recordLaborTime", label: "Record labor", help: "Record employee or subcontractor hours against a budget code.", fields: [title("Worker or crew"), notes(), select("relatedId", "Budget code", ["budgetCode"]), select("partnerId", "Trade partner (optional)", ["partner"], false), values("type", "Labor type", ["employee", "subcontractor"]), quantity("Hours", true), amount("Labor cost"), occurred("Worked")] },
    { operation: "createResourceCatalogItem", label: "Add equipment or material", help: "Add equipment or a material to the company catalog.", fields: [values("type", "Resource type", ["equipment", "material"]), ref("Equipment number or material SKU"), title("Resource name"), notes(), { ...unit, required: true }] },
  ],
  schedule: [
    { operation: "registerSchedule", label: "Add schedule", help: "Add a baseline, current or look-ahead schedule.", fields: [title("Schedule name"), values("type", "Schedule type", ["baseline", "current", "lookahead"]), occurred("Data date")] },
    { operation: "registerScheduleTask", label: "Add schedule task", help: "Add a planned activity to a schedule.", fields: [ref("Task code"), title("Task name"), notes(), select("relatedId", "Schedule", ["schedule"]), select("userId", "Assigned person (optional)", ["user"], false, { statuses: ["active"] }), { name: "occurredAt", label: "Planned start", type: "date" }, { name: "dueAt", label: "Planned finish", type: "date" }] },
    { operation: "linkScheduleDependency", label: "Link tasks", help: "Make one task depend on another in the same schedule.", fields: [select("relatedId", "Predecessor", ["scheduleTask"]), select("secondaryId", "Successor", ["scheduleTask"]), values("type", "Dependency type", ["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]), integer("Lag days", { min: "-3650", max: "3650" }, false)] },
    { operation: "updateScheduleTaskProgress", label: "Update task progress", help: "Update percent complete.", fields: [select("relatedId", "Schedule task", ["scheduleTask"], true, { statuses: ["not_started", "in_progress", "delayed", "on_hold"] }), integer("Percent complete", { min: "0", max: "100" })] },
  ],
  "quality-safety": [
    { operation: "recordSafetyIncident", label: "Record safety incident", help: "Report an incident and assign an investigator.", fields: [ref("Incident number"), title("Incident title"), notes("Incident description", true), values("incidentType", "Incident type", ["near_miss", "first_aid", "recordable_injury", "lost_time", "property_damage", "environmental", "security"]), values("type", "Severity", ["low", "moderate", "serious", "critical", "fatal"]), select("userId", "Investigator (optional)", ["user"], false, { statuses: ["active"] }), occurred("Occurred")] },
    { operation: "createInspectionWithItem", label: "Create inspection", help: "Create an inspection with its first checklist item.", fields: [ref("Inspection number"), title("Inspection title"), notes("First checklist item", true), due, select("userId", "Inspector (optional)", ["user"], false, { statuses: ["active"] })] },
    { operation: "registerInspectionTemplate", label: "Add inspection template", help: "Save a reusable checklist. Reusing a name creates its next version.", fields: [title("Template name"), values("type", "Inspection type", ["safety", "quality", "pre_installation", "commissioning", "regulatory", "equipment"]), notes("Checklist instructions", true)] },
    { operation: "recordInspectionItemResult", label: "Record inspection result", help: "Record pass, fail or not applicable for a checklist item.", fields: [select("relatedId", "Checklist item", ["inspectionItem"], true, { statuses: ["in_progress"] }), values("type", "Result", ["pass", "fail", "not_applicable"]), notes("Inspection notes", true), occurred("Inspected")] },
    { operation: "registerCorrectiveAction", label: "Open corrective action", help: "Open corrective work for an incident, observation, inspection item or punch item.", fields: [ref("Action number"), title("Corrective action title"), notes("Required correction", true), { name: "type", label: "Source type", type: "select", required: true, values: [{ value: "safetyIncident", label: "Safety incident" }, { value: "safetyObservation", label: "Safety observation" }, { value: "inspectionItem", label: "Inspection item" }, { value: "punchItem", label: "Punch item" }] }, select("relatedId", "Source", ["safetyIncident", "safetyObservation", "inspectionItem", "punchItem"], true, { kindField: "type" }), select("userId", "Assigned person (optional)", ["user"], false, { statuses: ["active"] }), due] },
    { operation: "recordCorrectiveActionEvidence", label: "Record correction evidence", help: "Attach completion notes and the evidence file before verification.", fields: [select("relatedId", "Corrective action", ["correctiveAction"], true, { statuses: ["in_progress", "ready_for_verification"] }), notes("Completion notes", true), evidence, occurred("Completed")] },
  ],
  procurement: [
    { operation: "createProcurementRequestWithLine", label: "Create procurement request", help: "Request an item or scope against a budget code.", fields: [ref("Request number"), title("Request title"), notes("Requested item or scope", true), amount("Estimated total"), select("relatedId", "Budget code", ["budgetCode"]), select("partnerId", "Suggested vendor (optional)", ["partner"], false), quantity(), unit, due] },
    { operation: "placeProcurementOrder", label: "Create purchase order", help: "Create a purchase order from an approved request.", fields: [ref("Purchase order number"), title("Purchase order title"), notes(), select("relatedId", "Approved request", ["procurementRequest"], true, { statuses: ["approved"] }), select("partnerId", "Vendor (optional if already selected)", ["partner"], false)] },
    { operation: "recordMaterialReceipt", label: "Record material receipt", help: "Record a delivery against a request line, with its packing slip.", fields: [ref("Receipt number"), notes("Receipt notes or rejection reason"), select("relatedId", "Procurement request", ["procurementRequest"], true, { statuses: ["ordered", "partially_received"] }), select("secondaryId", "Request line", ["procurementRequestLine"], true, { parentField: "relatedId" }), select("partnerId", "Vendor (optional)", ["partner"], false), values("type", "Receipt result", ["recorded", "rejected"]), quantity("Quantity received", true), { ...evidence, label: "Packing slip file", fileNameField: "title" }, occurred("Received")] },
  ],
  documents: [
    { operation: "registerDrawing", label: "Add drawing", help: "Add a drawing, then upload its revisions.", fields: [ref("Drawing number"), title("Drawing title"), notes("Discipline")] },
    { operation: "registerSpecificationSection", label: "Add specification section", help: "Add a spec section that submittals, RFIs and inspections can reference.", fields: [ref("Section number"), title("Section title"), { name: "type", label: "Division" }, notes()] },
  ],
  billing: [
    { operation: "recordLienWaiverEvidence", label: "Record lien waiver", help: "Record a received lien waiver and its signed file.", fields: [ref("Waiver number"), title("Signer name"), notes(), amount("Waiver amount"), select("relatedId", "Commitment", ["commitment"]), select("partnerId", "Trade partner", ["partner"]), values("type", "Waiver type", ["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"]), { ...due, label: "Through date" }, { ...evidence, label: "Signed waiver file" }, occurred("Received")] },
    { operation: "requestRetainageRelease", label: "Request retainage release", help: "Request release of retainage held on a claim.", fields: [ref("Release number"), notes("Release reason", true), amount("Release amount"), select("relatedId", "Progress claim", ["progressClaim"]), select("secondaryId", "Covering payment", ["payment"], true, { statuses: ["settled"] })] },
    { operation: "allocateSettledPayment", label: "Allocate payment", help: "Apply a settled payment to an approved claim.", fields: [select("relatedId", "Settled payment", ["payment"], true, { statuses: ["settled"] }), select("secondaryId", "Approved claim", ["progressClaim"], true, { statuses: ["approved", "partially_paid"] }), amount("Allocation amount")] },
    { operation: "reverseSettledPayment", label: "Reverse payment", help: "Reverse a settled payment and update the affected claims.", fields: [select("relatedId", "Settled payment", ["payment"], true, { statuses: ["settled"] }), ref("Reversal number"), title("Bank or processor reference"), notes("Reversal reason", true), occurred("Effective")] },
  ],
  team: [
    { operation: "inviteProjectMember", label: "Invite project participant", help: "Invite someone to this project with a role and access level.", fields: [ref("Email"), title("Name"), select("roleId", "Role", ["role"]), values("type", "Access level", ["viewer", "contributor", "manager"]), select("partnerId", "External organization (optional)", ["partner"], false), values("unit", "Portal type", ["internal", "owner", "designer", "subcontractor", "vendor"])] },
  ],
};

export const workflowDefinitions = workflows;

function EvidenceField({ field }: { field: Field }) {
  const [state, setState] = useState<{ fileName: string; checksum: string; error: string; hashing: boolean }>({ fileName: "", checksum: "", error: "", hashing: false });
  async function choose(file: File | undefined) {
    if (!file) return setState({ fileName: "", checksum: "", error: "", hashing: false });
    if (file.size > MAX_EVIDENCE_BYTES) return setState({ fileName: "", checksum: "", error: "Choose a file of 50 MB or less.", hashing: false });
    setState({ fileName: file.name, checksum: "", error: "", hashing: true });
    try {
      setState({ fileName: file.name, checksum: await sha256Hex(file), error: "", hashing: false });
    } catch {
      setState({ fileName: "", checksum: "", error: "The file could not be read. Choose it again.", hashing: false });
    }
  }
  return <div className="grid gap-1.5 text-xs font-medium md:col-span-2">
    <label className="grid gap-1.5">{field.label}
      <Input type="file" required={field.required && !state.checksum} onChange={event => void choose(event.target.files?.[0])} className="min-h-11" />
    </label>
    <label className="grid gap-1.5">Evidence reference
      <Input key={state.fileName} name="evidenceReference" required defaultValue={state.fileName.slice(0, 160)} maxLength={160} />
    </label>
    {field.fileNameField && <input type="hidden" name={field.fileNameField} value={state.fileName} />}
    <input type="hidden" name="evidenceChecksumSha256" value={state.checksum} />
    {state.hashing && <span role="status" className="font-normal text-muted-foreground">Reading file…</span>}
    {state.checksum && <span role="status" className="font-normal text-muted-foreground">File fingerprint recorded ({state.checksum.slice(0, 12)}…).</span>}
    {state.error && <span role="alert" className="font-normal text-destructive">{state.error}</span>}
  </div>;
}

const subscribeToNothing = () => () => undefined;

function DateTimeField({ field }: { field: Field }) {
  const [local, setLocal] = useState("");
  const timeZone = useSyncExternalStore(subscribeToNothing, userTimeZone, () => "");
  const instant = localDateTimeToInstant(local);
  const noteId = `${field.name}-timezone`;
  return <label className="grid gap-1.5 text-xs font-medium"><span>{field.label}</span>
    <Input type="datetime-local" required={field.required} value={local} onChange={event => setLocal(event.target.value)} aria-describedby={noteId} />
    <input type="hidden" name={field.name} value={instant ?? ""} />
    <span id={noteId} className="font-normal text-muted-foreground">{timeZone ? `Time zone: ${timeZone}` : "Your local time"}</span>
  </label>;
}

function WorkflowForm({ projectId, workflow, options }: { projectId: string; workflow: Workflow; options: ConstructionOption[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(runConstructionWorkflow);
  return (
    <form action={action} className="grid min-w-0 gap-3 border-t p-4 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 [&_textarea]:min-w-0 md:grid-cols-2 xl:grid-cols-3">
      <input type="hidden" name="operation" value={workflow.operation} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {/* A new key means the previous operation succeeded: start with fresh inputs. */}
      <WorkflowFields key={idempotencyKey} projectId={projectId} workflow={workflow} options={options} />
      <div className="flex items-end xl:col-start-3"><Button type="submit" disabled={pending} className="min-h-11 w-full">{pending ? "Saving…" : workflow.label}</Button></div>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-2 xl:col-span-3 ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}</p>}
      <div className="md:col-span-2 xl:col-span-3"><OneTimeSecretReceipt state={state} /></div>
    </form>
  );
}

function WorkflowFields({ projectId, workflow, options }: { projectId: string; workflow: Workflow; options: ConstructionOption[] }) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [chosenKinds, setChosenKinds] = useState<Record<string, string>>({});
  function choose(name: string, value: string, kind?: string) {
    setChosen(previous => {
      const next = { ...previous, [name]: value };
      // A changed parent or source type clears the selectors that depend on it.
      for (const field of workflow.fields) if (field.parentField === name || field.kindField === name) delete next[field.name];
      return next;
    });
    setChosenKinds(previous => ({ ...previous, [name]: kind ?? "" }));
  }
  return <>
      {workflow.fields.map(field => {
        const className = `grid gap-1.5 text-xs font-medium ${field.type === "textarea" ? "md:col-span-2 xl:col-span-3" : ""}`;
        if (field.derivedFrom) {
          const kind = chosenKinds[field.derivedFrom.field];
          return <input key={field.name} type="hidden" name={field.name} value={kind ? field.derivedFrom.byKind[kind] ?? "" : ""} />;
        }
        if (field.type === "evidence") return <EvidenceField key={field.name} field={field} />;
        if (field.type === "datetime-local") return <DateTimeField key={field.name} field={field} />;
        if (field.type === "textarea") return <label key={field.name} className={className}>{field.label}<Textarea name={field.name} required={field.required} className="min-h-20" /></label>;
        if (field.type === "select" && field.values) {
          return <label key={field.name} className={className}>{field.label}<FormSelect name={field.name} required={field.required} defaultValue="" onValueChange={value => choose(field.name, value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">{field.required ? "Select…" : "None"}</option>{field.values.map(entry => <option key={`${field.name}:${entry.value}`} value={entry.value}>{entry.label}</option>)}</FormSelect></label>;
        }
        if (field.type === "select") {
          const kinds = field.kindField && chosen[field.kindField] ? [chosen[field.kindField]] : field.optionKinds ?? [];
          const waiting = Boolean((field.parentField && !chosen[field.parentField]) || (field.kindField && !chosen[field.kindField]));
          return <label key={field.name} className={className}>{field.label}
            <RecordLookup key={`${field.name}:${field.parentField ? chosen[field.parentField] ?? "" : ""}:${field.kindField ? chosen[field.kindField] ?? "" : ""}`}
              name={field.name} projectId={projectId} kinds={kinds} required={field.required} emptyLabel={waiting ? "Choose the field above first" : field.required ? "Select…" : "None"}
              initial={eligibleOptions(field, options, chosen, chosenKinds)}
              eligible={option => eligibleOptions(field, [option], chosen, chosenKinds).length > 0}
              value={chosen[field.name] ?? ""} onValueChange={(value, option) => choose(field.name, value, option?.kind)} />
          </label>;
        }
        const rule = field.number;
        return <label key={field.name} className={className}><span>{field.label}</span><Input name={field.name} required={field.required} type={field.type || "text"} min={rule?.min} max={rule?.max} step={rule?.step} inputMode={rule?.inputMode} placeholder={field.placeholder} /></label>;
      })}
  </>;
}

export function WorkflowPanel({ tool, projectId, availableCommands, options }: { tool: string; projectId: string; availableCommands: string[]; options: ConstructionOption[] }) {
  const available = (workflows[tool] ?? []).filter(workflow => availableCommands.includes(workflow.operation));
  if (!available.length) return null;
  return (
    <section className="border-y bg-muted/15" aria-labelledby="project-actions-title">
      <div className="px-4 py-5 md:px-6"><h2 id="project-actions-title" className="text-base font-semibold">Project actions</h2></div>
      <div className="divide-y border-t">{available.map(workflow => <details key={workflow.operation} className="group"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 md:px-6"><span><span className="font-medium">{workflow.label}</span><span className="ml-3 hidden text-sm text-muted-foreground md:inline">{workflow.help}</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><p className="px-4 pb-3 text-sm text-muted-foreground md:hidden">{workflow.help}</p><WorkflowForm projectId={projectId} workflow={workflow} options={options} /></details>)}</div>
    </section>
  );
}
