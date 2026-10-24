# Construction schema map

Source: `features/keystone/models/**` (87 lists), `features/keystone/mutations/**`, `features/keystone/queries/**`, `features/keystone/domain/lifecycle.ts` and the onboarding seed (`features/platform/onboarding/lib/seed.json`, `features/keystone/mutations/onboarding.ts`).

## How the schema is put together

- **Tenancy:** every business record belongs to a **Company**. Most also belong to a **Project**.
  - Company-scoped lists use `companyModelAccess(read, manage)`. Project-scoped lists use `projectModelAccess` or a domain wrapper (`financialAccess`, `contractAccess`, `executionAccess`, …).
  - `projectTenantHooks` derives `company` from the connected project and rejects relationships that cross tenants (`relatedTenantTargets` in `domain/tenancy.ts`).
- **Permissions:** permissions live on **Role** and are granted through **CompanyMembership** (company-wide) and **ProjectMembership** (per project, with an access level and an optional portal organization for external users).
- **Writes:** most workflow writes go through custom mutations rather than plain CRUD.
  - Examples: `runConstructionCommand`, `runConstructionWorkflow`, `transitionConstructionRecord`, `createConstructionProject`.
  - They are idempotent (**IdempotencyKey**), audited (**AgentAction**) and emit events (**OutboxMessage**).
  - Status changes follow `lifecyclePolicies` (`domain/lifecycle.ts`).
- **Money:** amounts are stored as BigInt minor units with a currency code. Budget, contract, claim and payment totals are recalculated by hooks and workflows, never typed in.
- **External users:** clients and trade partners reach their records through `/portal` (`queries/portal.ts`, `mutations/portal.ts`). Website customers use `/account` (ServiceRequest).

## Lists

"Creator" means who creates the record: **M** = merchant staff (dashboard), **C** = website customer or portal user, **S** = system (hook, workflow side effect, onboarding).

### Identity, company and access

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| User | Staff, portal users and website customers | name, email, password, onboardingStatus | role, companyMemberships, projectMemberships, serviceRequests | M (invite), C (sign up), S (init) | onboarding: not_started → in_progress → completed / dismissed |
| AuthSession | Database session per sign-in | tokenHash, expiresAt | user | S | live / expired / revoked |
| Role | Permission bundle (canRead*/canManage* per domain) | name, 40+ permission checkboxes | company, companyMemberships, projectMemberships, assignedTo | M, S (onboarding) | — |
| Company | The contractor (tenant), with its brand and public identity | name, brandName/Mark/Tagline/Color, logoIcon/logoColor, contact, address | memberships, projects, roles, tradePartners, costCodes, equipment, materials, publicSiteProfile | S (onboarding) | active / suspended / archived |
| CompanyMembership | A user's role in a company | status, title, canAccessAllProjects | user, company, role, invitedBy | S (onboarding, invitations) | invited → active → suspended / revoked |
| AccountInvitation | One-time project invitation link | tokenHash, status, expiresAt, portalType | project, projectMembership, invitedBy, user | M (Team tool) | pending → accepted / revoked / expired |
| ApiCredential | Hashed API key for an agent or integration | prefix, hash, scopes, status | owner, project | M (Audit tool) | active → suspended → revoked |
| AgentIdentity | Named automated actor | name, approvalMode, status | owner, scopeGrants, actions | M | active / suspended / revoked |
| ScopeGrant | What an agent may do on a project | scopes, status | agentIdentity, project, grantedBy, revokedBy | M | active / inactive / revoked |
| AgentAction | Audit row for every command, human or agent | action, status, targetType/Id, reason | project, agentIdentity, requestedBy, actorUser, idempotencyKey | S | proposed → approved / rejected → running → succeeded / failed |
| IdempotencyKey | Replay protection for commands | key, operation, status, resource | project, agentAction | S | started → completed / failed |
| OutboxMessage | Outgoing domain events (webhook drain) | eventType, aggregate, attempts | project, agentAction | S | pending → processing → delivered / retry / dead_letter |

### Projects and company master data

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| Project | A construction job | projectNumber, name, dates, address, currencyCode | company, owner (TradePartner), projectManager, superintendent, memberships, locations, budgetCodes and all project records | M (`createConstructionProject`) | planning → active ⇄ on_hold → completed → archived |
| ProjectMembership | A person's access to one project, internal or portal | accessLevel, portalType, status | user, project, role, portalOrganization (TradePartner) | M (Team), S (project creation, invitation accept) | invited → active → suspended / revoked |
| TradePartner | Company directory: subcontractors, vendors, owners, designers, consultants, authorities | name, partnerType, status, contact, address | company, ownedProjects, projectMembers, bids, commitments, claims, payments, lien waivers, procurement | M (directory, preconstruction command), S (seed) | prospective → approved → inactive; any → blocked; blocked → prospective |
| ProjectLocation | Site → building → floor → area → room hierarchy | code, name, locationType | project, parent, children; referenced by RFI, punch, daily log entries, safety, inspections, schedule tasks, resource logs | M | — |
| CostCode | Company cost code library (CSI-style) | code (immutable), name, division, isActive | company, budgetCodes | M, S ("GEN" at project creation) | active / inactive |
| BudgetCode | A project's cost bucket, mapped to a company cost code | code, description, costType, isActive | project, costCode; used by budget, estimate, bid, contract, change, cost, labor and resource lines | M, S ("GEN" at project creation) | active / inactive |

### Pursuits and website

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| ConstructionLead | Prospective client or contact | name, email, source, status | owner, opportunities, intake submissions | M, S (website intake) | new → qualified / nurturing → converted / disqualified |
| ConstructionOpportunity | A pursuit being estimated or bid | title, stage, estimatedValueMinor, bidDueAt | lead, client (TradePartner), owner | M, S (intake) | qualifying → go_no_go → estimating → submitted → negotiating → won / lost / declined |
| PublicSiteProfile | The public website profile | headline, about, service area, contact | company, services, projects, submissions | M (Store Settings) | draft / published / archived |
| PublicService | A service offered on the website | title, slug, summary, price guidance | site, serviceRequests | M (Store Settings) | draft / published / archived |
| PublicProject | A portfolio case study on the website | title, slug, market, outcome | site, sourceProject | M (Store Settings) | draft / published / archived |
| IntakeSubmission | Website inquiry (contact, project, estimate, RFP, trade partner interest) | kind, publicReference, scope, contact | site, lead, opportunity | C (anonymous form), S (lead and opportunity linking) | received |
| ServiceRequest | A signed-in customer's quote request for a service | reference, scope, quote (version, amount, terms, expiry) | customer, service, events | C (request, accept, cancel), M (quote) | requested → quoted → payment_pending (accepted) / cancelled |
| ServiceRequestEvent | Append-only history of a request | eventType, payload | request, actor | S | — |

### Preconstruction

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| BidPackage | Scope put out to bid | number, title, bidType, dueAt | project, bidManager, invitations, submissions, awardedPartner | M | draft → open → closed → awarded → archived |
| BidInvitation | A partner invited to a package | status, sentAt, respondedAt | bidPackage, tradePartner, submission | M, C (portal: view, intent, decline) | draft → invited → viewed → intent_to_bid / declined → submitted |
| BidSubmission | A partner's priced bid | submissionNumber, totals, exclusions, clarifications | bidPackage, invitation, tradePartner, lineItems | M, C (portal) | draft → submitted → under_review → accepted / rejected / withdrawn |
| BidLineItem | Line of a bid | description, amount | submission, budgetCode | M, C | — |
| Estimate | Owner-facing estimate | number, title, status | project, estimator, versions, currentVersion | M | draft → internal_review → issued → accepted / rejected → superseded |
| EstimateVersion | Immutable revision of an estimate | versionNumber, totals | estimate, lineItems | M (revise) | draft → issued → superseded |
| EstimateLineItem | Line of an estimate version | description, quantity, cost | version, budgetCode | M | — |

### Financials and contracts

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| Budget | Project budget (versioned) | version, status, totals | project, lineItems, changes | S (project creation) | draft → approved → active → closed |
| BudgetLineItem | Budget per budget code with projections | original, revised, committed, actual, projected | budget, budgetCode | M (`addBudgetLine`), S | — |
| BudgetChange | Budget transfer or adjustment | number, totalAmountMinor | budget, sourceChangeEvent, lineItems | M | draft → pending_approval → approved / rejected → posted |
| BudgetChangeLineItem | Line of a budget change | amount | budgetChange, budgetLineItem, budgetCode | M | — |
| DirectCost | Invoice, expense or payroll posted to job cost | costType, amount, costDate | budgetCode, tradePartner, commitment | M | draft → pending → approved → posted → voided (reversal) |
| PrimeContract | Owner contract | number, contractType, values | client (TradePartner), lineItems, changeOrders, progressClaims | M | draft → pending_approval → approved → executed → closed |
| Commitment | Subcontract or purchase order | number, commitmentType, values, retainage | tradePartner, lineItems, changeOrders, claims, direct costs, lien waivers | M, S (bid award) | draft → out_for_signature → executed → complete → closed; cancelled / terminated |
| ContractLineItem | Schedule of values line | amounts | primeContract or commitment, budgetCode | M | — |
| ChangeEvent | Potential cost or schedule exposure | number, eventType, estimatedCost | sourceRfi, lineItems, quotes, changeOrders | M | open → pricing → pending_approval → approved → incorporated; rejected / voided |
| ChangeEventLineItem | Line of exposure | amount | changeEvent, budgetCode | M | — |
| ChangeQuote | Partner pricing for a change event | amount, status | changeEvent, line, tradePartner | M, C (portal) | requested → received → accepted / rejected / withdrawn |
| ChangeOrder | Executed change to a prime contract or commitment | number, direction, total | primeContract / commitment, changeEvents, lineItems | M | draft → pending_approval → approved → executed → posted |
| ChangeOrderLineItem | Line of a change order | amount | changeOrder, contractLineItem, changeEventLineItem, budgetCode | M | — |

### Build (execution, field, schedule, documents)

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| RFI | Request for information | number, subject, question, priority, costImpact, dueAt | raisedBy, ballInCourt, responsiblePartner, location, specificationSection, drawingRevision, responses | M, C (portal response) | draft → open → answered → closed; voided |
| RFIResponse | Answer to an RFI | response, isOfficial | rfi, author, onBehalfOf | M, C | — |
| SpecificationSection | Spec book section | number, title | submittals, rfis, inspections | M | — |
| Submittal | Shop drawings, product data, samples | number, type, revision, dueAt | specificationSection, responsiblePartner, reviews | M, C (portal) | draft → submitted → under_review → approved / revise_resubmit / rejected → closed; voided |
| SubmittalReview | Review step | sequence, status, response | submittal, reviewer, reviewerPartner | M, C | pending → in_review → approved / approved_as_noted / revise_resubmit / rejected |
| Drawing | Controlled drawing | drawingNumber, discipline, status | currentRevision, revisions | M | active / archived / voided |
| DrawingRevision | Issued drawing file | revisionNumber, file, status | drawing | M | draft → issued → superseded / voided |
| Document | Controlled document | documentNumber, documentType, status | currentVersion, versions | M | active / archived / voided |
| DocumentVersion | Uploaded file version | versionNumber, storageKey, checksum | document, distributions | M | — |
| DocumentDistribution | A version issued to a project member | distributedAt | documentVersion, recipient (ProjectMembership), acknowledgements | M | — |
| DocumentAcknowledgement | Receipt of a distribution | acknowledgedAt | distribution, acknowledgedBy | C (portal) | — |
| DailyLog | Daily field report | logDate, weather, notes | preparedBy, approvedBy, entries | M | draft → submitted → approved |
| DailyLogEntry | Line of a daily log | entryType, quantity, delayDays | dailyLog, location, tradePartner, equipment, material, safety, inspection, task | M | — |
| Schedule | Baseline, current, lookahead or recovery schedule | scheduleType, dataDate | tasks, dependencies | M | draft → published → archived |
| ScheduleTask | Activity | taskCode, dates, percentComplete | schedule, parent, location, responsiblePartner, assignedTo | M | not_started → in_progress → completed; delayed / on_hold |
| ScheduleDependency | Task link | dependencyType, lag | predecessor, successor | M | — |
| PunchItem | Deficiency to close | number, priority, dueAt | assignedTo, responsiblePartner, location, drawingRevision, inspectionItem | M, C (portal) | open → in_progress → ready_for_review → closed; voided |
| LaborEntry | Hours worked | workDate, hours, cost | worker, tradePartner, budgetCode, dailyLog, scheduleTask | M | — |
| Equipment | Company equipment fleet | equipmentNumber, ownershipType, hourlyCost | company, logs | M | available ⇄ in_use, out_of_service, retired |
| Material | Company material catalog | sku, unit, standardCost | company, logs, procurement and receipt lines | M | active ⇄ inactive, discontinued |
| ResourceLog | Equipment use or material movement on a project | resourceType, eventType, quantity, cost | equipment / material, budgetCode, dailyLog, location, operator, tradePartner | M | — (append-only, with recovery journal) |

### Quality and safety

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| SafetyIncident | Incident report, with restricted private details | incidentNumber, type, severity | reportedBy, investigator, location, correctiveActions | M | reported → investigating → corrective_action → closed |
| SafetyObservation | Observed practice or condition | observationNumber, type | observedBy, assignedTo, location | M | open → assigned → resolved → closed |
| InspectionTemplate | Reusable checklist | name, inspectionType, checklist | project, inspections | M | — |
| Inspection | Scheduled inspection | inspectionNumber, scheduledAt | template, inspector, location, items | M | scheduled → in_progress → passed / failed → closed; cancelled |
| InspectionItem | Checklist line result | result, notes | inspection, punchItems, correctiveActions | M | pending → pass / fail / not_applicable |
| CorrectiveAction | Fix for an incident, observation, inspection item or punch item | actionNumber, dueAt, evidence | assignedTo, verifiedBy, its source record | M | open → in_progress → ready_for_verification → verified → closed |

### Procurement and billing

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| ProcurementRequest | Request to buy materials or services | requestNumber, neededBy, total | requestedBy, tradePartner, commitment, lines, receipts | M | draft → submitted → approved → ordered → partially_received → received → closed; rejected / cancelled |
| ProcurementRequestLine | Line of a request | quantity, unit cost | request, budgetCode, material | M | — |
| MaterialReceipt | Delivery received on site | receiptNumber, receivedAt | request, commitment, tradePartner, lines | M | recorded → accepted_with_exceptions / rejected / voided |
| MaterialReceiptLine | Line received | quantities | receipt, requestLine, material | M | — |
| ProgressClaim | Pay application, owner or subcontractor | claimNumber, period, G702 totals | primeContract / commitment, tradePartner, lineItems, allocations | M, C (portal) | draft → submitted → under_review → approved / rejected → partially_paid → paid → closed; voided |
| ProgressClaimLineItem | Schedule-of-values progress | work completed, stored materials | progressClaim, contractLineItem | M, C | — |
| Payment | Money received or disbursed | paymentNumber, direction, method, amount | tradePartner, allocations, reversals, lienWaivers | M | pending → authorized → settled → reversed; failed / voided |
| PaymentAllocation | Payment applied to a claim | amount | payment, progressClaim | M | — |
| PaymentReversal | Reversal of a settled payment | reason, snapshot | payment, reversedBy | M | — |
| RetainageRelease | Release of held retainage | releaseNumber, amount | progressClaim, line, payment | M | requested → approved → released; rejected / voided |
| LienWaiver | Conditional or unconditional waiver | waiverType, throughDate, file | tradePartner, commitment, progressClaim, payment | M, C (portal upload) | requested → received → accepted / rejected / expired |

### Governance

| List | Purpose | Key fields | Relationships | Creator | States |
|---|---|---|---|---|---|
| ApprovalPolicy | Who must approve what above which amount | domain, minimumAmount, isActive | project, approverRole, requests | S (project creation), M | active / inactive |
| ApprovalRequest | Pending approval for a budget change, contract, change order, claim or retainage release | status, amount | policy, requestedBy, assignedTo, decisions | S | pending → approved / rejected / cancelled / superseded |
| ApprovalDecision | A decision on a request | decision, comment | request, decidedBy | M, C (portal owner approval) | approved / rejected |

## Merchant workflows end to end

1. **Set up the company:** onboarding → Company, Role, CompanyMembership, CostCode, PublicSiteProfile. Then add the trade partner directory, cost code library, and equipment and material catalog.
2. **Win work:**
   1. Website intake (IntakeSubmission) or manual entry.
   2. ConstructionLead → ConstructionOpportunity (go/no-go → estimating → submitted → won).
   3. Estimate → EstimateVersion → lines.
   4. Quote requests from signed-in customers (ServiceRequest, events).
3. **Start the project:**
   1. `createConstructionProject` creates the Project, the creator's ProjectMembership, CostCode/BudgetCode "GEN", the Budget and its line, and the ApprovalPolicies.
   2. Add budget codes and locations (cost structure).
   3. Invite the team (AccountInvitation → ProjectMembership).
4. **Buy out:**
   1. BidPackage → BidInvitation (portal) → BidSubmission and lines.
   2. Level the bids, then award, which creates a Commitment and its lines.
   3. PrimeContract with lines.
5. **Control cost:** BudgetLineItem, BudgetChange (approval), DirectCost (post / reverse), LaborEntry, ResourceLog. Job cost and forecast reports.
6. **Manage change:** RFI → ChangeEvent → ChangeQuote (portal) → ChangeOrder (approval) → posts to the contract and budget.
7. **Build:** RFI and responses, Submittal and reviews, Drawing and Document versions with distributions and acknowledgements, DailyLog and entries, Schedule, tasks and dependencies.
8. **Buy materials:** ProcurementRequest (lines from the Material catalog) → order → MaterialReceipt (lines) → ResourceLog, which can feed DirectCost.
9. **Quality and safety:**
   - Observation → CorrectiveAction.
   - Incident (private details) → investigation → CorrectiveAction.
   - InspectionTemplate → Inspection → items → PunchItem or CorrectiveAction.
10. **Get paid and pay out:**
    1. ProgressClaim (owner: from the prime contract; subcontractor: from a commitment, via the portal) → approval.
    2. Payment → PaymentAllocation; RetainageRelease; LienWaiver (portal upload, review).
    3. PaymentReversal when needed.
11. **Close and audit:** reports export (CSV); the audit trail (AgentAction, OutboxMessage, IdempotencyKey); API keys and agents (ApiCredential, AgentIdentity, ScopeGrant).

## Coverage

Routes are under `/dashboard/platform`. "Tool" means a project workspace tool at `/dashboard/platform/projects/[projectId]/<tool>`, rendered by `features/platform/projects` with its register, commands, lifecycle actions and record detail (`records/[recordType]/[recordId]`).

| Workflow / list | Before | After |
|---|---|---|
| Company, Role, CompanyMembership, User | Setup (`/setup`, `features/platform/onboarding`); Users and Roles in the shared dashboard | Same |
| Store / brand / website content (PublicSiteProfile, PublicService, PublicProject) | Store Settings (`/store-settings`) | Same |
| Leads and opportunities, intake (ConstructionLead, ConstructionOpportunity, IntakeSubmission) | Pipeline (`/pipeline`, `/pipeline/[id]`, `/pipeline/requests/[id]`, `/pipeline/create`) | Same |
| Quote requests (ServiceRequest, ServiceRequestEvent) | Quote requests (`/service-requests`) | Same |
| Portfolio and project list (Project) | Portfolio, Projects | Same |
| **Trade partner directory (TradePartner)** | **MISSING**: create-only command inside Preconstruction; no list, edit, status or history | **Trade partners** (`/trade-partners`, `/trade-partners/[id]`, `features/platform/trade-partners`) |
| **Company cost codes (CostCode)** | **MISSING**: only the automatic "GEN" code | **Cost codes** (`/cost-codes`, `features/platform/cost-codes`) |
| **Equipment and material catalog (Equipment, Material)** | **THIN**: create command in Field operations; no list, edit or status | **Equipment & materials** (`/resources`, `features/platform/resources`) |
| **Project budget codes (BudgetCode)** | **THIN**: every project had only "GEN", so budgets, estimates, bids and contracts could not be split by cost code | **Cost structure** tool (`/projects/[id]/structure`, `features/platform/project-structure`) |
| **Project locations (ProjectLocation)** | **MISSING**: no way to create one, though RFIs, punch, safety, inspections and logs reference them | **Cost structure** tool (same page) |
| Bids, estimates (BidPackage, BidInvitation, BidSubmission, BidLineItem, Estimate, EstimateVersion, EstimateLineItem) | Preconstruction tool (bid leveling, commands, transitions, detail) | Same |
| Budget, budget changes, direct costs (Budget, BudgetLineItem, BudgetChange, BudgetChangeLineItem, DirectCost) | Financials tool | Same |
| Contracts and changes (PrimeContract, Commitment, ContractLineItem, ChangeEvent, ChangeEventLineItem, ChangeQuote, ChangeOrder, ChangeOrderLineItem) | Contracts tool | Same |
| Procurement (ProcurementRequest + lines, MaterialReceipt + lines, commitment register, bid invitations, lien waiver register) | Procurement tool | Same |
| RFIs, submittals (RFI, RFIResponse, Submittal, SubmittalReview, SpecificationSection) | Execution tool | Same |
| Field (DailyLog, DailyLogEntry, LaborEntry, ResourceLog) | Field tool (resource register, recovery) | Same |
| Schedule (Schedule, ScheduleTask, ScheduleDependency) | Schedule tool | Same |
| Quality and safety (SafetyIncident, SafetyObservation, InspectionTemplate, Inspection, InspectionItem, CorrectiveAction, PunchItem) | Quality & safety tool | Same |
| Documents (Drawing, DrawingRevision, Document, DocumentVersion, DocumentDistribution, DocumentAcknowledgement) | Documents tool (controlled files) | Same |
| Billing (ProgressClaim + lines, Payment, PaymentAllocation, PaymentReversal, RetainageRelease, LienWaiver) | Billing tool | Same |
| Approvals (ApprovalPolicy, ApprovalRequest, ApprovalDecision) | Approval panel in the Financials, Contracts and Billing tools | Same |
| Team (ProjectMembership, AccountInvitation) | Team tool | Same |
| Reports | Reports tool (CSV export) | Same |
| Audit and agents (AgentAction, OutboxMessage, IdempotencyKey, ApiCredential, AgentIdentity, ScopeGrant) | Audit tool (API keys) | Same |
| AuthSession | System list; no page needed (sessions end at sign-out or expiry) | Same |

## Storefront coverage

| Customer workflow | Flow |
|---|---|
| Browse services → service detail → quote request → quote → accept / cancel → account history | `/services` → `/services/[slug]` → `/account` (request form) → `/account/requests/[id]` |
| Browse past work | `/projects` (market filter) → `/projects/[slug]` |
| Inquiries (project, estimate, client intake, RFP, trade partner, contact) | `/start-a-project`, `/estimate`, `/client-intake`, `/rfp`, `/trade-partners`, `/contact` → `/requests/[ref]/confirmation` |
| Client and trade partner project portal | `/accept-invitation` → `/portal` → `/portal/projects/[id]` and `/[tool]` (bids, RFIs, submittals, approvals, pay applications, lien waivers, acknowledgements, downloads) |
| Account | `/account` (sign in / up, details), `/account/reset` |

Gap kept: IntakeSubmission has no customer relationship, so website inquiries cannot appear in a signed-in customer's account history. Adding one is a schema change with a migration, and anonymous inquiry is the intended design.
