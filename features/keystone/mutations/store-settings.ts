import { createHash, randomUUID } from "node:crypto";
import type { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";
import { lockCurrentAuthority } from "../domain/current-authority";
import { getTrustedPublicSiteKey, publicSlug } from "../domain/public-site";
import { normalizeStoreLogoColor } from "../../lib/store-logo";
import { sanitizeStoreLogoSvg } from "../../lib/sanitize-store-logo";
import { PUBLIC_PROJECT_LIMITS as P } from "../../lib/public-content-limits";

const base = { companyId: z.string().min(1).max(200), idempotencyKey: z.string().min(1).max(200) };
const status = z.enum(["draft", "published", "archived"]);
const content = z.discriminatedUnion("operation", [
  z.object({ ...base, operation: z.literal("branding"), brandName: z.string().trim().min(2).max(120), brandMark: z.string().regex(/^[A-Z0-9]{1,4}$/), brandTagline: z.string().max(240), brandColor: z.string().regex(/^#[0-9a-f]{6}$/i), logoIcon: z.string().max(100000), logoColor: z.string().max(40) }).strict(),
  z.object({ ...base, operation: z.literal("profile"), status, serviceArea: z.string().trim().min(2).max(240), capabilitySummary: z.string().trim().min(20).max(1200), inquiryEmail: z.string().email().max(320), inquiryPhone: z.string().max(50), privacyNotice: z.string().trim().min(20).max(1200), acceptingInquiries: z.boolean() }).strict(),
  z.object({ ...base, operation: z.literal("service"), id: z.string().max(200).optional(), title: z.string().trim().min(2).max(160), summary: z.string().trim().min(20).max(500), details: z.string().max(4000), market: z.string().max(160), status }).strict(),
  z.object({ ...base, operation: z.literal("project"), id: z.string().max(200).optional(), sourceProjectId: z.string().max(200).optional(), title: z.string().trim().min(2).max(P.title.max), summary: z.string().trim().min(20).max(P.summary.max), description: z.string().max(P.description.max), market: z.string().max(P.market.max), locationLabel: z.string().max(P.locationLabel.max), deliveryMethod: z.string().max(P.deliveryMethod.max), completionLabel: z.string().max(P.completionLabel.max), approvedOutcome: z.string().max(P.approvedOutcome.max).optional(), status }).strict(),
]);
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function constructionStoreSettings(_root: unknown, { companyId }: { companyId?: string }, context: KeystoneContext) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const companies: Array<{ id: string; name: string }> = await context.prisma.company.findMany({
    where: { status: "active", memberships: { some: { userId: actorId, status: "active", role: { canManageSettings: true } } } },
    select: { id: true, name: true }, take: 50, orderBy: { name: "asc" },
  });
  const configured = await context.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() }, include: { company: { select: { id: true } } } });
  const selected = companyId || configured?.company?.id;
  if (!selected) return { companies, company: null, profile: null, services: [], projects: [] };
  if (!companies.some(company => company.id === selected)) throw new Error("Store settings not found");
  return context.transaction(async tx => {
    await lockCurrentAuthority(tx, selected, null, "canManageSettings");
    const company = await tx.prisma.company.findUnique({ where: { id: selected }, select: { id: true, name: true, brandName: true, brandMark: true, brandTagline: true, brandColor: true, logoIcon: true, logoColor: true } });
    const profile = configured?.company?.id === selected ? await tx.prisma.publicSiteProfile.findUnique({ where: { id: configured.id }, select: { id: true, status: true, serviceArea: true, capabilitySummary: true, inquiryEmail: true, inquiryPhone: true, privacyNotice: true, acceptingInquiries: true } }) : null;
    const [services, projects] = profile ? await Promise.all([
      tx.prisma.publicService.findMany({ where: { companyId: selected, siteId: profile.id }, take: 50, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true, slug: true, summary: true, details: true, market: true, status: true } }),
      tx.prisma.publicProject.findMany({ where: { companyId: selected, siteId: profile.id }, take: 50, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true, slug: true, summary: true, description: true, market: true, locationLabel: true, deliveryMethod: true, completionLabel: true, approvedOutcome: true, status: true } }),
    ]) : [[], []];
    return { companies, company: company && { ...company, logoIcon: sanitizeStoreLogoSvg(company.logoIcon), logoColor: normalizeStoreLogoColor(company.logoColor) }, profile, services, projects };
  });
}

export async function updateConstructionStoreSettings(_root: unknown, { input: unknownInput }: { input: unknown }, context: KeystoneContext) {
  const input = content.parse(unknownInput);
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  if (input.operation === "branding") {
    const safe = sanitizeStoreLogoSvg(input.logoIcon);
    if (input.logoIcon.trim() && !safe) throw new Error("Logo must be a valid, safe SVG document");
    input.logoIcon = safe; input.logoColor = normalizeStoreLogoColor(input.logoColor);
  }
  const actorId = context.session.itemId;
  return context.transaction(async tx => {
    const fresh = await lockCurrentAuthority(tx, input.companyId, null, "canManageSettings");
    const scoped = tx.withSession(fresh);
    const sudo = scoped.sudo();
    const fingerprint = hash([input.companyId, actorId, "updateConstructionStoreSettings", input.idempotencyKey]);
    const requestHash = hash(input);
    const replay = await tx.prisma.idempotencyKey.findUnique({ where: { fingerprint } });
    if (replay) {
      if (replay.requestHash !== requestHash || replay.status !== "completed") throw new Error("Settings request key was already used for different details");
      return { success: true, operation: "updateConstructionStoreSettings", itemId: input.companyId, actionId: replay.agentActionId, replayed: true };
    }
    let site = await tx.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() }, include: { company: { select: { id: true } } } });
    if (site?.company?.id && site.company.id !== input.companyId) throw new Error("Configured public site belongs to another company");
    if (input.operation === "branding") {
      const { brandName, brandMark, brandTagline, brandColor, logoIcon, logoColor } = input;
      await sudo.db.Company.updateOne({ where: { id: input.companyId }, data: { brandName, brandMark, brandTagline, brandColor, logoIcon, logoColor } });
    } else if (input.operation === "profile") {
      const { status, serviceArea, capabilitySummary, inquiryEmail, inquiryPhone, privacyNotice, acceptingInquiries } = input;
      const data = { status, serviceArea, capabilitySummary, inquiryEmail, inquiryPhone, privacyNotice, acceptingInquiries };
      if (site) await sudo.db.PublicSiteProfile.updateOne({ where: { id: site.id }, data });
      else {
        const created = await sudo.db.PublicSiteProfile.createOne({ data: { ...data, siteKey: getTrustedPublicSiteKey(), company: { connect: { id: input.companyId } } } });
        site = await tx.prisma.publicSiteProfile.findUnique({ where: { id: String(created.id) }, include: { company: { select: { id: true } } } });
      }
    } else {
      if (!site?.id || site.company?.id !== input.companyId) throw new Error("Create the public profile first");
      if (input.operation === "service") {
        const { title, summary, details, market, status } = input;
        if (input.id) {
          const current = await tx.prisma.publicService.findUnique({ where: { id: input.id } });
          if (!current || current.companyId !== input.companyId || current.siteId !== site.id) throw new Error("Service not found");
          await sudo.db.PublicService.updateOne({ where: { id: input.id }, data: { title, summary, details, market, status } });
        } else {
          if (await tx.prisma.publicService.count({ where: { siteId: site.id } }) >= 50) throw new Error("Public service limit reached");
          const slug = publicSlug(title, randomUUID());
          await sudo.db.PublicService.createOne({ data: { title, summary, details, market, status, slug, serviceKey: `${input.companyId}:${slug}`, company: { connect: { id: input.companyId } }, site: { connect: { id: site.id } } } });
        }
      } else {
        const { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status } = input;
        if (input.id) {
          const current = await tx.prisma.publicProject.findUnique({ where: { id: input.id } });
          if (!current || current.companyId !== input.companyId || current.siteId !== site.id) throw new Error("Public project not found");
          await sudo.db.PublicProject.updateOne({ where: { id: input.id }, data: { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status } });
        } else {
          const source = input.sourceProjectId ? await tx.prisma.project.findUnique({ where: { id: input.sourceProjectId } }) : null;
          if (input.sourceProjectId && source?.companyId !== input.companyId) throw new Error("Source project not found");
          if (await tx.prisma.publicProject.count({ where: { siteId: site.id } }) >= 50) throw new Error("Public project limit reached");
          const slug = publicSlug(title, randomUUID());
          await sudo.db.PublicProject.createOne({ data: { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status, slug, publicationKey: `${input.companyId}:${slug}`, ...(source ? { sourceProject: { connect: { id: source.id } } } : {}), company: { connect: { id: input.companyId } }, site: { connect: { id: site.id } } } });
        }
      }
    }
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: randomUUID(), actorType: "human", action: `storeSettings.${input.operation}`, status: "succeeded", targetType: "Company", targetId: input.companyId, targetStatus: input.operation,
      reason: `Save explicitly selected ${input.operation} fields`, requestDigest: requestHash, resultDigest: hash([input.companyId, input.operation]),
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(), company: { connect: { id: input.companyId } }, requestedBy: { connect: { id: actorId } }, actorUser: { connect: { id: actorId } },
    } });
    await sudo.db.IdempotencyKey.createOne({ data: { fingerprint, key: input.idempotencyKey, operation: "updateConstructionStoreSettings", requestHash, status: "completed", resourceType: "Company", resourceId: input.companyId, toStatus: input.operation, expiresAt: new Date(Date.now() + 86400000), company: { connect: { id: input.companyId } }, agentAction: { connect: { id: action.id } } } });
    const payload = JSON.stringify({ schemaVersion: 1, eventType: "StoreSettings.saved", companyId: input.companyId, section: input.operation, actorId });
    await sudo.db.OutboxMessage.createOne({ data: { messageKey: `StoreSettings:${action.id}`, eventType: "StoreSettings.saved", aggregateType: "Company", aggregateId: input.companyId, canonicalPayload: payload, payloadDigest: createHash("sha256").update(payload).digest("hex"), status: "pending", company: { connect: { id: input.companyId } }, agentAction: { connect: { id: action.id } } } });
    return { success: true, operation: "updateConstructionStoreSettings", itemId: input.companyId, actionId: String(action.id), replayed: false };
  }, { timeout: 15000 });
}
