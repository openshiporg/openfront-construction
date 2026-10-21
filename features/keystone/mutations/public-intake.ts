import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getTrustedPublicSiteKey } from "../domain/public-site";
import { queryOne, type KeystoneQueryApi, type KeystoneQueryRecord } from "../domain/tenancy";

const INTAKE_KINDS = [
  "general_contact",
  "project_inquiry",
  "estimate_request",
  "rfp_invitation",
  "trade_partner_interest",
] as const;
type IntakeKind = typeof INTAKE_KINDS[number];

const SOURCE_PATHS: Record<IntakeKind, readonly string[]> = {
  general_contact: ["/contact"],
  project_inquiry: ["/start-a-project", "/client-intake"],
  estimate_request: ["/estimate"],
  rfp_invitation: ["/rfp"],
  trade_partner_interest: ["/bid", "/trade-partners"],
};

export type PublicIntakeInput = {
  kind: string;
  contactName: string;
  organization?: string | null;
  email: string;
  phone?: string | null;
  contactRole?: string | null;
  projectName?: string | null;
  projectType?: string | null;
  locationSummary?: string | null;
  deliveryMethod?: string | null;
  budgetRange?: string | null;
  desiredStart?: string | null;
  desiredCompletion?: string | null;
  designStage?: string | null;
  servicesSought?: string | null;
  scopeSummary: string;
  referralSource?: string | null;
  sourcePath: string;
  privacyConsent: boolean;
  /** Digest of the privacy notice the visitor was shown when consenting. */
  privacyNoticeDigest?: string | null;
  idempotencyKey: string;
  website?: string | null;
};

export type PublicIntakeResult = {
  success: true;
  publicReference: string;
  kind: IntakeKind;
  submittedAt: string;
  replayed: boolean;
};

type MutationApi = {
  createOne?(args: { data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
  updateOne?(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
};

type PublicIntakeContext = {
  sudo(): { query: Record<string, KeystoneQueryApi>; db: Record<string, MutationApi> };
  prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
  transaction?<T>(callback: (context: PublicIntakeContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};

type IntakeRecord = KeystoneQueryRecord & {
  publicReference?: string;
  kind?: IntakeKind;
  submittedAt?: string;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredText(value: unknown, label: string, max: number, min = 1) {
  if (typeof value !== "string" || value.trim().length < min) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

function optionalText(value: unknown, label: string, max: number) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

function emailAddress(value: unknown) {
  const email = requiredText(value, "Email", 320, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email must be valid");
  return email;
}

function optionalDate(value: unknown, label: string) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`${label} must be a calendar date`);
  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} must be valid`);
  return parsed;
}

function canonical(value: Record<string, unknown>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))));
}

function normalize(input: PublicIntakeInput) {
  if (!INTAKE_KINDS.includes(input.kind as IntakeKind)) throw new Error("Inquiry type is invalid");
  const kind = input.kind as IntakeKind;
  const sourcePath = requiredText(input.sourcePath, "Source path", 120);
  if (!SOURCE_PATHS[kind].includes(sourcePath)) throw new Error("Inquiry source does not match its type");
  if (input.website?.trim()) throw new Error("Unable to accept this request");
  if (input.privacyConsent !== true) throw new Error("Privacy consent is required");

  const normalized = {
    kind,
    contactName: requiredText(input.contactName, "Contact name", 200, 2),
    organization: optionalText(input.organization, "Organization", 240),
    email: emailAddress(input.email),
    phone: optionalText(input.phone, "Phone", 50),
    contactRole: optionalText(input.contactRole, "Contact role", 160),
    projectName: optionalText(input.projectName, "Project name", 240),
    projectType: optionalText(input.projectType, kind === "trade_partner_interest" ? "Trade or specialty" : "Project type", 160),
    locationSummary: optionalText(input.locationSummary, kind === "trade_partner_interest" ? "Service area" : "Project location", 500),
    deliveryMethod: optionalText(input.deliveryMethod, "Delivery method", 120),
    budgetRange: optionalText(input.budgetRange, "Budget range", 120),
    desiredStart: optionalDate(input.desiredStart, "Desired start"),
    desiredCompletion: optionalDate(input.desiredCompletion, "Desired completion"),
    designStage: optionalText(input.designStage, "Design stage", 160),
    servicesSought: optionalText(input.servicesSought, "Services sought", 600),
    scopeSummary: requiredText(input.scopeSummary, kind === "general_contact" ? "Message" : "Scope summary", 5000, 10),
    referralSource: optionalText(input.referralSource, "Referral source", 240),
    sourcePath,
    idempotencyKey: requiredText(input.idempotencyKey, "Idempotency key", 200, 8),
  };

  if (["project_inquiry", "estimate_request", "rfp_invitation"].includes(kind)) {
    if (!normalized.organization) throw new Error("Organization is required for a project request");
    if (!normalized.projectName) throw new Error("Project name is required");
    if (!normalized.projectType) throw new Error("Project type is required");
    if (!normalized.locationSummary) throw new Error("Project location or region is required");
    if (!normalized.servicesSought) throw new Error("Services sought are required");
  }
  if (kind === "rfp_invitation" && !normalized.deliveryMethod) throw new Error("Delivery method is required for an RFP invitation");
  if (kind === "trade_partner_interest") {
    if (!normalized.organization) throw new Error("Trade company is required");
    if (!normalized.projectType) throw new Error("Trade or specialty is required");
    if (!normalized.locationSummary) throw new Error("Service area is required");
  }
  if (normalized.desiredStart && normalized.desiredCompletion && normalized.desiredCompletion < normalized.desiredStart) {
    throw new Error("Desired completion cannot be before desired start");
  }
  return normalized;
}

function requestHashFor(normalized: ReturnType<typeof normalize>, privacyNoticeDigest: string) {
  return digest(canonical({
    ...normalized,
    privacyNoticeDigest,
    desiredStart: normalized.desiredStart?.toISOString() ?? null,
    desiredCompletion: normalized.desiredCompletion?.toISOString() ?? null,
    idempotencyKey: undefined,
  }));
}

async function recoverExistingIntake(context: PublicIntakeContext, key: KeystoneQueryRecord, normalized: ReturnType<typeof normalize>, companyId: string, siteId: string): Promise<PublicIntakeResult> {
  if (key.status !== "completed" || typeof key.resourceId !== "string") throw new Error("This request is still being recorded");
  const record = await queryOne(context, "IntakeSubmission", { id: key.resourceId }, "id publicReference kind submittedAt requestDigest privacyNoticeDigest company { id } site { id }");
  const site = record?.site;
  if (!record || record.company?.id !== companyId || !site || typeof site !== "object" || !("id" in site) || site.id !== siteId ||
      typeof record.privacyNoticeDigest !== "string" || record.requestDigest !== key.requestHash ||
      requestHashFor(normalized, record.privacyNoticeDigest) !== key.requestHash) throw new Error("Idempotency key was already used with different request data");
  if (typeof record.publicReference !== "string" || typeof record.submittedAt !== "string" || !INTAKE_KINDS.some(kind => kind === record.kind)) throw new Error("Public request receipt is incomplete");
  // Validate the persisted kind without asserting a generated output map.
  const kind = INTAKE_KINDS.find(kind => kind === record.kind);
  if (!kind) throw new Error("Public request receipt is incomplete");
  return publicResult({ ...record, kind, publicReference: record.publicReference, submittedAt: record.submittedAt }, true);
}

function publicResult(record: IntakeRecord, replayed: boolean): PublicIntakeResult {
  if (!record.publicReference || !record.kind || !record.submittedAt) throw new Error("Public request receipt is incomplete");
  return {
    success: true,
    publicReference: record.publicReference,
    kind: record.kind,
    submittedAt: new Date(record.submittedAt).toISOString(),
    replayed,
  };
}

async function create(context: PublicIntakeContext, listKey: string, data: Record<string, unknown>) {
  const createOne = context.sudo().db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create operation is unavailable`);
  return createOne({ data });
}

async function update(context: PublicIntakeContext, listKey: string, id: string, data: Record<string, unknown>) {
  const updateOne = context.sudo().db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update operation is unavailable`);
  return updateOne({ where: { id }, data });
}

export async function submitPublicIntake(
  _root: unknown,
  { input }: { input: PublicIntakeInput },
  context: PublicIntakeContext,
): Promise<PublicIntakeResult> {
  const normalized = normalize(input);
  const site = await queryOne(
    context,
    "PublicSiteProfile",
    { siteKey: getTrustedPublicSiteKey() },
    "id siteKey status acceptingInquiries privacyNotice company { id }",
  );
  const companyId = site?.company?.id;
  if (!site?.id || !companyId) {
    throw new Error("Public project requests are not currently available");
  }

  const submissionKey = digest(`${companyId}\u001fsubmitPublicIntake\u001f${normalized.idempotencyKey}`);
  const existingKey = await queryOne(context, "IdempotencyKey", { fingerprint: submissionKey }, "requestHash status resourceId");
  if (existingKey) return recoverExistingIntake(context, existingKey, normalized, companyId, String(site.id));

  const privacyNoticeSnapshot = requiredText(site.privacyNotice, "Published privacy notice", 10_000, 1);
  const privacyNoticeDigest = digest(privacyNoticeSnapshot);
  const presentedDigest = input.privacyNoticeDigest?.trim();
  if (presentedDigest && presentedDigest !== privacyNoticeDigest) {
    throw new Error("The privacy notice changed; review the current notice before sending your request");
  }
  const requestHash = requestHashFor(normalized, privacyNoticeDigest);
  const deduplicationKey = digest([companyId, requestHash].join(String.fromCharCode(31)));
  const leadKey = digest([companyId, normalized.email].join(String.fromCharCode(31)));

  if (!context.transaction) throw new Error("Transactional public intake is required");
  return context.transaction(async tx => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional public intake locking is unavailable");
    for (const lock of [submissionKey, deduplicationKey, leadKey].sort()) {
      await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, lock);
    }

    const lockedKey = await queryOne(tx, "IdempotencyKey", { fingerprint: submissionKey }, "requestHash status resourceId");
    if (lockedKey) return recoverExistingIntake(tx, lockedKey, normalized, companyId, String(site.id));

    // Settings acquires Company before updating the profile. Use the same order
    // and keep both publication/consent rows stable through this new admission.
    const companies = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "Company" WHERE id = $1 AND status = \'active\' FOR SHARE', companyId);
    if (companies.length !== 1) throw new Error("Public project requests are not currently available");
    const [published] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; acceptingInquiries: boolean; privacyNotice: string }>>(`SELECT profile.status::text, profile."acceptingInquiries", profile."privacyNotice"
      FROM "PublicSiteProfile" profile JOIN "Company" company ON company.id = profile.company
      WHERE profile.id = $1 AND profile.company = $2 AND profile."siteKey" = $3 AND company."publicSiteProfile" = profile.id
      FOR SHARE OF profile`, String(site.id), companyId, getTrustedPublicSiteKey());
    if (!published || published.status !== "published" || published.acceptingInquiries !== true) throw new Error("Public project requests are not currently available");
    if (digest(requiredText(published.privacyNotice, "Published privacy notice", 10_000, 1)) !== privacyNoticeDigest) throw new Error("The privacy notice changed; review the current notice before submitting again");

    const duplicate = await queryOne(tx, "IntakeSubmission", { deduplicationKey }, "id publicReference kind submittedAt") as IntakeRecord | null;
    if (duplicate?.id) {
      await create(tx, "IdempotencyKey", {
        fingerprint: submissionKey,
        key: normalized.idempotencyKey,
        operation: "submitPublicIntake",
        requestHash,
        status: "completed",
        resourceType: "IntakeSubmission",
        resourceId: duplicate.id,
        company: { connect: { id: companyId } },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      return publicResult(duplicate, true);
    }

    // Site volume is not a shared admission quota. One submitter must not
    // consume every other visitor's ability to make a legitimate inquiry.

    const submittedAt = new Date();
    const publicReference = `REQ-${randomBytes(12).toString("hex").toUpperCase()}`;
    const buyerInquiry = ["project_inquiry", "estimate_request", "rfp_invitation"].includes(normalized.kind);
    const contactInquiry = normalized.kind !== "trade_partner_interest";
    let lead: (Record<string, unknown> & { id: string }) | null = null;
    let opportunity: (Record<string, unknown> & { id: string }) | null = null;

    if (contactInquiry) {
      lead = await queryOne(tx, "ConstructionLead", { leadKey }, "id") as (Record<string, unknown> & { id: string }) | null;
      if (!lead) {
        const legacyMatches = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "ConstructionLead" WHERE company = $1 AND lower(btrim(email)) = $2
           ORDER BY "createdAt" ASC LIMIT 2 FOR UPDATE`, companyId, normalized.email,
        );
        if (legacyMatches.length > 1) throw new Error("This contact has multiple legacy leads; operator review is required before accepting another inquiry");
        if (legacyMatches.length === 1) {
          const legacyId = String(legacyMatches[0].id);
          // Linking an existing contact must not rewrite its historical owner
          // or trigger unrelated owner corrections during a public inquiry.
          // The exact existing row is locked above; no new contact is invented.
          lead = { id: legacyId };
        }
      }
      if (!lead) {
        lead = await create(tx, "ConstructionLead", {
          leadKey,
          name: normalized.contactName,
          organization: normalized.organization,
          email: normalized.email,
          phone: normalized.phone,
          source: "public_opportunity",
          status: "new",
          notes: `Received through ${normalized.sourcePath}; source details remain in ${publicReference}.`,
          company: { connect: { id: companyId } },
        });
      }
    }

    if (buyerInquiry) {
      opportunity = await create(tx, "ConstructionOpportunity", {
        number: publicReference,
        name: normalized.projectName,
        organization: normalized.organization,
        deliveryMethod: normalized.deliveryMethod,
        locationSummary: normalized.locationSummary,
        stage: "qualifying",
        notes: `Public qualification request ${publicReference}; review the immutable intake before creating project or estimate records.`,
        ...(lead ? { lead: { connect: { id: lead.id } } } : {}),
        company: { connect: { id: companyId } },
      });
    }

    const submission = await create(tx, "IntakeSubmission", {
      submissionKey,
      deduplicationKey,
      publicReference,
      kind: normalized.kind,
      status: "received",
      contactName: normalized.contactName,
      organization: normalized.organization,
      email: normalized.email,
      phone: normalized.phone,
      contactRole: normalized.contactRole,
      projectName: normalized.projectName,
      projectType: normalized.projectType,
      locationSummary: normalized.locationSummary,
      deliveryMethod: normalized.deliveryMethod,
      budgetRange: normalized.budgetRange,
      desiredStart: normalized.desiredStart,
      desiredCompletion: normalized.desiredCompletion,
      designStage: normalized.designStage,
      servicesSought: normalized.servicesSought,
      scopeSummary: normalized.scopeSummary,
      referralSource: normalized.referralSource,
      sourcePath: normalized.sourcePath,
      privacyVersion: privacyNoticeDigest,
      privacyNoticeSnapshot,
      privacyNoticeDigest,
      consentAt: submittedAt,
      submittedAt,
      requestDigest: requestHash,
      site: { connect: { id: String(site.id) } },
      company: { connect: { id: companyId } },
      ...(lead ? { lead: { connect: { id: lead.id } } } : {}),
      ...(opportunity ? { opportunity: { connect: { id: opportunity.id } } } : {}),
    });
    const idempotency = await create(tx, "IdempotencyKey", {
      fingerprint: submissionKey,
      key: normalized.idempotencyKey,
      operation: "submitPublicIntake",
      requestHash,
      status: "started",
      resourceType: "IntakeSubmission",
      resourceId: submission.id,
      company: { connect: { id: companyId } },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const action = await create(tx, "AgentAction", {
      actionKey: randomUUID(),
      actorType: "system",
      action: "submitPublicIntake",
      status: "succeeded",
      targetType: "IntakeSubmission",
      targetId: submission.id,
      targetStatus: "received",
      reason: "Record a consented public qualification request without granting account, project, estimate, contract, or bid authority",
      requestDigest: requestHash,
      resultDigest: digest(`${submission.id}\u001f${publicReference}`),
      requestedAt: submittedAt,
      startedAt: submittedAt,
      completedAt: submittedAt,
      company: { connect: { id: companyId } },
      idempotencyKey: { connect: { id: idempotency.id } },
    });
    await update(tx, "IdempotencyKey", idempotency.id, {
      status: "completed",
      agentAction: { connect: { id: action.id } },
    });
    const payload = JSON.stringify({
      schemaVersion: 1,
      eventType: "PublicIntake.received",
      companyId,
      intakeSubmissionId: submission.id,
      publicReference,
      kind: normalized.kind,
    });
    await create(tx, "OutboxMessage", {
      messageKey: `submitPublicIntake:${submission.id}`,
      eventType: "PublicIntake.received",
      aggregateType: "IntakeSubmission",
      aggregateId: submission.id,
      canonicalPayload: payload,
      payloadDigest: digest(payload),
      status: "pending",
      company: { connect: { id: companyId } },
      agentAction: { connect: { id: action.id } },
    });

    return {
      success: true,
      publicReference,
      kind: normalized.kind,
      submittedAt: submittedAt.toISOString(),
      replayed: false,
    };
  }, { timeout: 30_000 });
}
