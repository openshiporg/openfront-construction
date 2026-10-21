import { createHash, randomUUID } from "node:crypto";

import { hasPermission, type Session } from "../access";
import { getTrustedPublicSiteKey, publicSlug } from "../domain/public-site";
import { permissionsList } from "../models/fields";
import { hasNativeAuthorityPort, lockInitialOnboardingAuthority } from "../domain/current-authority";
import { APPROVAL_POLICY_DOMAINS, assertWorkspaceReady, seedSampleWorkspace, seedWorkspaceSetup, type SeedDb } from "../domain/onboarding-seed";
import { queryCount, queryOne, type KeystoneQueryApi } from "../domain/tenancy";

export type ConstructionOnboardingInput = {
  fictionalFixture?: boolean;
  companyName: string;
  companySlug: string;
  legalName?: string | null;
  brandName: string;
  brandMark: string;
  brandTagline?: string | null;
  brandColor: string;
  projectNumber: string;
  projectName: string;
  projectDescription?: string | null;
  startDate?: string | null;
  completionDate?: string | null;
  clientName?: string | null;
  tradePartnerName?: string | null;
  currencyCode: string;
  costCode: string;
  costCodeName: string;
  budgetCode: string;
  budgetCodeDescription: string;
  publicContactEmail: string;
  publicContactPhone?: string | null;
  publicServiceArea: string;
  publicCapabilitySummary: string;
  primaryServiceName: string;
  primaryServiceSummary: string;
  publicPrivacyNotice: string;
  publishFirstProject: boolean;
  publicProjectSummary?: string | null;
  publicProjectMarket?: string | null;
  publicProjectLocation?: string | null;
  idempotencyKey: string;
};

type DbApi = {
  createOne(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
  updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
};

type OnboardingContext = {
  session?: Session;
  prisma?: { user?: unknown; $queryRawUnsafe?<T = unknown>(sql: string, ...values: unknown[]): Promise<T> };
  sudo(): { query: Record<string, KeystoneQueryApi>; db: Record<string, DbApi> & SeedDb };
  transaction?<T>(callback: (context: OnboardingContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};

export type ConstructionOnboardingResult = {
  success: true;
  companyId: string;
  projectId: string;
  actionId: string;
  replayed: boolean;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

function optionalDate(value: unknown, label = "Project start date") {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} is invalid`);
  return parsed;
}

function optionalText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

function canonical(input: ConstructionOnboardingInput) {
  return JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))));
}

async function replay(
  context: OnboardingContext,
  fingerprint: string,
  requestHash: string,
): Promise<ConstructionOnboardingResult | null> {
  const record = await queryOne(
    context,
    "IdempotencyKey",
    { fingerprint },
    "id requestHash status resourceId toStatus agentAction { id }",
  ) as Record<string, unknown> & { agentAction?: { id?: string } | null } | null;
  if (!record) return null;
  if (record.requestHash !== requestHash) throw new Error("Idempotency key was already used with different onboarding data");
  if (record.status !== "completed" || !record.resourceId || !record.toStatus || !record.agentAction?.id) {
    throw new Error("Onboarding request is still in progress");
  }
  return {
    success: true,
    companyId: String(record.resourceId),
    projectId: String(record.toStatus),
    actionId: record.agentAction.id,
    replayed: true,
  };
}

const managerPermissions = new Set([
  "canAccessDashboard", "canReadCompanies", "canManageCompanies", "canReadPeople", "canManagePeople",
  "canReadProjects", "canManageProjects", "canReadPreconstruction", "canManagePreconstruction",
  "canReadFinancials", "canManageFinancials", "canReadContracts", "canManageContracts",
  "canReadProjectExecution", "canManageProjectExecution", "canReadDocuments", "canManageDocuments",
  "canReadFieldOperations", "canManageFieldOperations", "canReadSafety", "canManageSafety",
  "canReadBilling", "canManageBilling", "canReadAgents", "canReadAudit", "canManageOnboarding",
]);
const fieldPermissions = new Set([
  "canAccessDashboard", "canReadCompanies", "canReadProjects", "canReadProjectExecution",
  "canReadDocuments", "canReadFieldOperations", "canManageFieldOperations", "canReadSafety",
  "canManageSafety",
]);
const externalPermissions = new Set([
  "canReadProjects", "canReadPreconstruction", "canManagePreconstruction",
  "canReadProjectExecution", "canManageProjectExecution", "canReadDocuments",
  "canReadFieldOperations", "canManageFieldOperations", "canReadSafety",
  "canReadBilling", "canManageBilling",
]);

function roleData(name: string, companyId: string, enabled: Set<string> | "all") {
  return {
    name,
    company: { connect: { id: companyId } },
    ...Object.fromEntries(permissionsList.map(permission => [permission, enabled === "all" || enabled.has(permission)])),
  };
}

export async function onboardConstructionWorkspace(
  _root: unknown,
  { input }: { input: ConstructionOnboardingInput },
  context: OnboardingContext,
): Promise<ConstructionOnboardingResult> {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key") throw new Error("A live user session is required for first-company onboarding");
  if (!hasPermission(session, "canManageOnboarding") || !hasPermission(session, "canManageCompanies")) {
    throw new Error("Only the initial platform administrator can onboard a company");
  }

  const normalized: ConstructionOnboardingInput = {
    ...input,
    companyName: text(input.companyName, "Company name", 200),
    companySlug: text(input.companySlug, "Company slug", 120).toLowerCase(),
    legalName: optionalText(input.legalName, "Legal name", 240) ?? null,
    brandName: text(input.brandName, "Brand name", 120),
    brandMark: text(input.brandMark, "Brand mark", 4).toUpperCase(),
    brandTagline: optionalText(input.brandTagline, "Tagline", 240) ?? null,
    brandColor: text(input.brandColor, "Brand color", 7).toUpperCase(),
    projectNumber: text(input.projectNumber, "Project number", 80),
    projectName: text(input.projectName, "Project name", 240),
    projectDescription: optionalText(input.projectDescription, "Project description", 4000) ?? null,
    // New optional setup fields stay out of the request hash when empty, so
    // retries of requests made before they existed still replay.
    completionDate: optionalText(input.completionDate, "Planned completion date", 40),
    clientName: optionalText(input.clientName, "Client", 240),
    tradePartnerName: optionalText(input.tradePartnerName, "Trade partner", 240),
    currencyCode: text(input.currencyCode, "Currency code", 3).toUpperCase(),
    costCode: text(input.costCode, "Cost code", 40),
    costCodeName: text(input.costCodeName, "Cost code name", 200),
    budgetCode: text(input.budgetCode, "Budget code", 80),
    budgetCodeDescription: text(input.budgetCodeDescription, "Budget code description", 240),
    publicContactEmail: text(input.publicContactEmail, "Public contact email", 320).toLowerCase(),
    publicContactPhone: input.publicContactPhone?.trim() || null,
    // The service area is also the primary public service's market (max 160).
    publicServiceArea: text(input.publicServiceArea, "Public service area", 160),
    publicCapabilitySummary: text(input.publicCapabilitySummary, "Public capability summary", 1200),
    primaryServiceName: text(input.primaryServiceName, "Primary public service", 160),
    primaryServiceSummary: text(input.primaryServiceSummary, "Primary service summary", 500),
    publicPrivacyNotice: text(input.publicPrivacyNotice, "Public privacy notice", 1200),
    publishFirstProject: input.publishFirstProject === true,
    publicProjectSummary: input.publicProjectSummary?.trim() || null,
    publicProjectMarket: input.publicProjectMarket?.trim() || null,
    publicProjectLocation: input.publicProjectLocation?.trim() || null,
    idempotencyKey: text(input.idempotencyKey, "Idempotency key", 200),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.publicContactEmail)) throw new Error("Public contact email is invalid");
  if (normalized.publicContactPhone && normalized.publicContactPhone.length > 50) throw new Error("Public contact phone must be at most 50 characters");
  if (normalized.publicCapabilitySummary.length < 20 || normalized.primaryServiceSummary.length < 20 || normalized.publicPrivacyNotice.length < 20) {
    throw new Error("Public capability, service, and privacy summaries must each be at least 20 characters");
  }
  if (normalized.publishFirstProject && (!normalized.publicProjectSummary || normalized.publicProjectSummary.length < 20)) {
    throw new Error("A public project summary of at least 20 characters is required when publishing the first project");
  }
  if (normalized.publicProjectSummary && normalized.publicProjectSummary.length > 600) throw new Error("Public project summary must be at most 600 characters");
  if (normalized.publicProjectMarket && normalized.publicProjectMarket.length > 160) throw new Error("Public project market must be at most 160 characters");
  if (normalized.publicProjectLocation && normalized.publicProjectLocation.length > 200) throw new Error("Public project location must be at most 200 characters");
  if (normalized.brandName.length < 2) throw new Error("Brand name must be at least 2 characters");
  if (normalized.publishFirstProject && normalized.projectName.length > 200) throw new Error("Project name must be at most 200 characters to publish it");
  const startDate = optionalDate(normalized.startDate);
  const completionDate = optionalDate(normalized.completionDate, "Planned completion date");
  if (startDate && completionDate && completionDate < startDate) throw new Error("Planned completion must be after the start date");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.companySlug)) throw new Error("Company slug is invalid");
  if (!/^[A-Z0-9]{1,4}$/.test(normalized.brandMark)) throw new Error("Brand mark must use 1–4 letters or numbers");
  if (!/^#[0-9A-F]{6}$/.test(normalized.brandColor)) throw new Error("Brand color must be a six-digit hex value");
  if (!/^[A-Z]{3}$/.test(normalized.currencyCode)) throw new Error("Currency code must be an ISO-style three-letter code");
  if (normalized.currencyCode !== "USD") throw new Error("Only USD is currently supported until end-to-end currency propagation is complete");

  const requestHash = digest(canonical(normalized));
  const fingerprint = digest(`${session.itemId}\u001fonboardConstructionWorkspace\u001f${normalized.idempotencyKey}`);
  if (!context.transaction) throw new Error("Transactional onboarding context is required");
  return context.transaction(async tx => {
      if (hasNativeAuthorityPort(tx)) await lockInitialOnboardingAuthority(tx);
      const existing = await replay(tx, fingerprint, requestHash);
      if (existing) return existing;
      const membershipCount = await queryCount(tx, "CompanyMembership", {
        user: { id: { equals: session.itemId } }, status: { equals: "active" },
      });
      if (membershipCount > 0) throw new Error("First-company onboarding is already complete for this account");
      const sudo = tx.sudo();
      const company = await sudo.db.Company.createOne({ data: {
        name: normalized.companyName,
        slug: normalized.companySlug,
        legalName: normalized.legalName || "",
        ...(normalized.fictionalFixture ? { isDemo: true } : {}),
        status: "active",
        brandName: normalized.brandName,
        brandMark: normalized.brandMark,
        brandTagline: normalized.brandTagline || "",
        brandColor: normalized.brandColor,
      } });
      const [administratorRole, managerRole, fieldRole, externalRole] = await Promise.all([
        sudo.db.Role.createOne({ data: roleData("Company Administrator", company.id, "all") }),
        sudo.db.Role.createOne({ data: roleData("Project Manager", company.id, managerPermissions) }),
        sudo.db.Role.createOne({ data: roleData("Field Lead", company.id, fieldPermissions) }),
        sudo.db.Role.createOne({ data: roleData("External Collaborator", company.id, externalPermissions) }),
      ]);
      await sudo.db.CompanyMembership.createOne({ data: {
        membershipKey: `${company.id}:${session.itemId}`,
        status: "active",
        canAccessAllProjects: true,
        joinedAt: new Date(),
        role: { connect: { id: administratorRole.id } },
        company: { connect: { id: company.id } },
        user: { connect: { id: session.itemId } },
      } });
      // Client and first trade partner are the operator's own entries (or the
      // sample workspace's fictional ones); prequalification stays prospective.
      const client = normalized.clientName ? await sudo.db.TradePartner.createOne({ data: {
        name: normalized.clientName, partnerType: "owner", status: "prospective", company: { connect: { id: company.id } },
      } }) : null;
      const tradePartner = normalized.tradePartnerName ? await sudo.db.TradePartner.createOne({ data: {
        name: normalized.tradePartnerName, partnerType: "subcontractor", status: "prospective", company: { connect: { id: company.id } },
      } }) : null;
      const project = await sudo.db.Project.createOne({ data: {
        projectNumber: normalized.projectNumber,
        name: normalized.projectName,
        description: normalized.projectDescription || "",
        startDate,
        ...(completionDate ? { substantialCompletionDate: completionDate } : {}),
        ...(client ? { owner: { connect: { id: client.id } } } : {}),
        currencyCode: normalized.currencyCode,
        projectManager: { connect: { id: session.itemId } },
        superintendent: { connect: { id: session.itemId } },
        company: { connect: { id: company.id } },
      } });
      const publicSite = await sudo.db.PublicSiteProfile.createOne({ data: {
        siteKey: getTrustedPublicSiteKey(),
        status: "published",
        serviceArea: normalized.publicServiceArea,
        capabilitySummary: normalized.publicCapabilitySummary,
        inquiryEmail: normalized.publicContactEmail,
        inquiryPhone: normalized.publicContactPhone || "",
        privacyNotice: normalized.publicPrivacyNotice,
        acceptingInquiries: true,
        company: { connect: { id: company.id } },
      } });
      const serviceSlug = publicSlug(normalized.primaryServiceName, "construction-services");
      await sudo.db.PublicService.createOne({ data: {
        serviceKey: `${company.id}:${serviceSlug}`,
        slug: serviceSlug,
        title: normalized.primaryServiceName,
        summary: normalized.primaryServiceSummary,
        details: normalized.publicCapabilitySummary,
        market: normalized.publicServiceArea,
        sortOrder: 0,
        status: "published",
        site: { connect: { id: publicSite.id } },
        company: { connect: { id: company.id } },
      } });
      if (normalized.publishFirstProject) {
        const publicationSlug = publicSlug(normalized.projectName, normalized.projectNumber.toLowerCase());
        await sudo.db.PublicProject.createOne({ data: {
          publicationKey: `${company.id}:${publicationSlug}`,
          slug: publicationSlug,
          title: normalized.projectName,
          summary: normalized.publicProjectSummary,
          description: normalized.projectDescription || "",
          market: normalized.publicProjectMarket || "",
          locationLabel: normalized.publicProjectLocation || "",
          completionLabel: "Current work",
          sortOrder: 0,
          status: "published",
          sourceProject: { connect: { id: project.id } },
          site: { connect: { id: publicSite.id } },
          company: { connect: { id: company.id } },
        } });
      }
      await sudo.db.ProjectMembership.createOne({ data: {
        membershipKey: `${project.id}:${session.itemId}`,
        status: "active",
        accessLevel: "manager",
        portalType: "internal",
        joinedAt: new Date(),
        role: { connect: { id: administratorRole.id } },
        project: { connect: { id: project.id } },
        user: { connect: { id: session.itemId } },
      } });
      const costCode = await sudo.db.CostCode.createOne({ data: {
        code: normalized.costCode,
        name: normalized.costCodeName,
        isActive: true,
        company: { connect: { id: company.id } },
      } });
      const budgetCode = await sudo.db.BudgetCode.createOne({ data: {
        code: normalized.budgetCode,
        description: normalized.budgetCodeDescription,
        costType: "other",
        isActive: true,
        costCode: { connect: { id: costCode.id } },
        project: { connect: { id: project.id } },
      } });
      const budget = await sudo.db.Budget.createOne({ data: {
        name: "Initial project budget",
        version: 1,
        status: "active",
        currencyCode: normalized.currencyCode,
        approvedAt: new Date(),
        approvedBy: { connect: { id: session.itemId } },
        project: { connect: { id: project.id } },
      } });
      await sudo.db.BudgetLineItem.createOne({ data: {
        description: normalized.budgetCodeDescription,
        budget: { connect: { id: budget.id } },
        budgetCode: { connect: { id: budgetCode.id } },
        project: { connect: { id: project.id } },
      } });
      for (const domain of APPROVAL_POLICY_DOMAINS) {
        await sudo.db.ApprovalPolicy.createOne({ data: {
          policyKey: `${company.id}:${project.id}:${domain}:default`,
          name: `Default ${domain.replaceAll("_", " ")} approval`,
          domain,
          minimumAmountMinor: "0",
          currencyCode: normalized.currencyCode,
          isActive: true,
          approverRole: { connect: { id: administratorRole.id } },
          company: { connect: { id: company.id } },
          project: { connect: { id: project.id } },
        } });
      }
      const setup = await seedWorkspaceSetup(sudo.db, { projectId: project.id, startDate, completionDate });
      const sampleWorkspace = Boolean(normalized.fictionalFixture);
      if (sampleWorkspace) {
        if (!client || !tradePartner || !startDate) throw new Error("The sample workspace needs its client, trade partner and start date");
        await seedSampleWorkspace(sudo.db, {
          companyId: company.id, projectId: project.id, actorId: session.itemId, budgetCodeId: budgetCode.id,
          clientId: client.id, tradePartnerId: tradePartner.id, locationId: setup.locationId,
          scheduleId: setup.scheduleId, inspectionTemplateId: setup.inspectionTemplateId, startDate,
        });
      }
      // Completion is recorded only after the persisted setup passes readiness.
      await assertWorkspaceReady(sudo.query, { companyId: company.id, projectId: project.id, actorId: session.itemId });
      const idempotency = await sudo.db.IdempotencyKey.createOne({ data: {
        fingerprint,
        key: normalized.idempotencyKey,
        operation: "onboardConstructionWorkspace",
        requestHash,
        status: "started",
        resourceType: "Company",
        resourceId: company.id,
        toStatus: project.id,
        company: { connect: { id: company.id } },
        project: { connect: { id: project.id } },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } });
      const action = await sudo.db.AgentAction.createOne({ data: {
        actionKey: randomUUID(),
        actorType: "human",
        action: "onboardConstructionWorkspace",
        status: "succeeded",
        targetType: "Company",
        targetId: company.id,
        targetStatus: "onboarded",
        reason: sampleWorkspace
          ? "Create the fictional sample contractor workspace"
          : "Create the first contractor workspace",
        requestDigest: requestHash,
        resultDigest: digest(`${company.id}\u001f${project.id}`),
        requestedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        company: { connect: { id: company.id } },
        project: { connect: { id: project.id } },
        requestedBy: { connect: { id: session.itemId } },
        actorUser: { connect: { id: session.itemId } },
        idempotencyKey: { connect: { id: idempotency.id } },
      } });
      await sudo.db.IdempotencyKey.updateOne({ where: { id: idempotency.id }, data: {
        status: "completed",
        agentAction: { connect: { id: action.id } },
      } });
      await sudo.db.User.updateOne({ where: { id: session.itemId }, data: { onboardingStatus: "completed" } });
      const payload = JSON.stringify({
        schemaVersion: 1,
        eventType: "ConstructionWorkspace.onboarded",
        companyId: company.id,
        projectId: project.id,
        publicSiteId: publicSite.id,
        actorId: session.itemId,
        sampleWorkspace,
      });
      await sudo.db.OutboxMessage.createOne({ data: {
        messageKey: `onboardConstructionWorkspace:${company.id}:${normalized.idempotencyKey}`,
        eventType: "ConstructionWorkspace.onboarded",
        aggregateType: "Company",
        aggregateId: company.id,
        canonicalPayload: payload,
        payloadDigest: digest(payload),
        status: "pending",
        company: { connect: { id: company.id } },
        project: { connect: { id: project.id } },
        agentAction: { connect: { id: action.id } },
      } });
      void managerRole; void fieldRole; void externalRole;
      return { success: true, companyId: company.id, projectId: project.id, actionId: action.id, replayed: false };
    }, { timeout: 60_000 });
}
