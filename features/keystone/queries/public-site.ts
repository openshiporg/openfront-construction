import { getTrustedPublicSiteKey } from "../domain/public-site";
import { queryOne, type KeystoneContextLike, type KeystoneQueryRecord } from "../domain/tenancy";

import { sanitizeStoreLogoSvg } from "../../lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "../../lib/store-logo";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PublicQueryContext = KeystoneContextLike;

type SiteRecord = KeystoneQueryRecord & {
  status?: string;
  serviceArea?: string;
  capabilitySummary?: string;
  inquiryEmail?: string;
  inquiryPhone?: string | null;
  privacyNotice?: string;
  acceptingInquiries?: boolean;
  company?: { id?: string; status?: string; name?: string; brandName?: string; brandMark?: string; brandTagline?: string; brandColor?: string; logoIcon?: string; logoColor?: string } | null;
};

type PublicRecord = KeystoneQueryRecord & Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function validateSlug(value: unknown) {
  const slug = text(value).toLowerCase();
  if (!slugPattern.test(slug) || slug.length > 100) throw new Error("Public slug is invalid");
  return slug;
}

async function publishedSite(context: PublicQueryContext): Promise<SiteRecord | null> {
  const site = await queryOne(
    context,
    "PublicSiteProfile",
    { siteKey: getTrustedPublicSiteKey() },
    "id siteKey status serviceArea capabilitySummary inquiryEmail inquiryPhone privacyNotice acceptingInquiries company { id status name brandName brandMark brandTagline brandColor logoIcon logoColor }",
  ) as SiteRecord | null;
  return site?.status === "published" && site.company?.id && site.company.status === "active" ? site : null;
}

async function findMany(
  context: PublicQueryContext,
  listKey: string,
  where: Record<string, unknown>,
  query: string,
  take: number,
): Promise<readonly PublicRecord[]> {
  const operation = context.sudo().query[listKey]?.findMany;
  if (!operation) throw new Error(`${listKey} public projection is unavailable`);
  return operation({ where, query, take, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }) as Promise<readonly PublicRecord[]>;
}

function projectProjection(record: PublicRecord) {
  return {
    slug: text(record.slug),
    title: text(record.title),
    summary: text(record.summary),
    description: text(record.description),
    market: text(record.market),
    locationLabel: text(record.locationLabel),
    deliveryMethod: text(record.deliveryMethod),
    completionLabel: text(record.completionLabel),
    approvedOutcome: text(record.approvedOutcome),
  };
}

function serviceProjection(record: PublicRecord) {
  return {
    slug: text(record.slug),
    title: text(record.title),
    summary: text(record.summary),
    details: text(record.details),
    market: text(record.market),
  };
}

export async function publicConstructionSite(_root: unknown, _args: unknown, context: PublicQueryContext) {
  const site = await publishedSite(context);
  if (!site?.id || !site.company?.id) return null;
  const [services, projects] = await Promise.all([
    findMany(context, "PublicService", { site: { id: { equals: site.id } }, status: { equals: "published" } }, "slug title summary details market sortOrder", 50),
    findMany(context, "PublicProject", { site: { id: { equals: site.id } }, status: { equals: "published" } }, "slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome sortOrder", 50),
  ]);
  return {
    brandName: text(site.company.brandName, text(site.company.name, "Openfront Construction")),
    brandMark: text(site.company.brandMark),
    logoIcon: sanitizeStoreLogoSvg(text(site.company.logoIcon)),
    logoColor: normalizeStoreLogoColor(site.company.logoColor),
    brandTagline: text(site.company.brandTagline),
    brandColor: text(site.company.brandColor, "#1D4ED8"),
    serviceArea: text(site.serviceArea),
    capabilitySummary: text(site.capabilitySummary),
    inquiryEmail: text(site.inquiryEmail),
    inquiryPhone: text(site.inquiryPhone),
    privacyNotice: text(site.privacyNotice),
    acceptingInquiries: site.acceptingInquiries === true,
    services: services.map(serviceProjection),
    projects: projects.map(projectProjection),
  };
}

export async function publicConstructionService(
  _root: unknown,
  { slug: rawSlug }: { slug: string },
  context: PublicQueryContext,
) {
  const site = await publishedSite(context);
  if (!site?.company?.id) return null;
  const slug = validateSlug(rawSlug);
  const record = await queryOne(
    context,
    "PublicService",
    { serviceKey: `${site.company.id}:${slug}` },
    "slug title summary details market status site { id }",
  ) as PublicRecord | null;
  if (!record || record.status !== "published" || (record.site as { id?: string } | null)?.id !== site.id) return null;
  return serviceProjection(record);
}

export async function publicConstructionProject(
  _root: unknown,
  { slug: rawSlug }: { slug: string },
  context: PublicQueryContext,
) {
  const site = await publishedSite(context);
  if (!site?.company?.id) return null;
  const slug = validateSlug(rawSlug);
  const record = await queryOne(
    context,
    "PublicProject",
    { publicationKey: `${site.company.id}:${slug}` },
    "slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome status site { id }",
  ) as PublicRecord | null;
  if (!record || record.status !== "published" || (record.site as { id?: string } | null)?.id !== site.id) return null;
  return projectProjection(record);
}

export async function publicIntakeReceipt(
  _root: unknown,
  { reference }: { reference: string },
  context: PublicQueryContext,
) {
  const site = await publishedSite(context);
  const normalized = text(reference).toUpperCase();
  if (!site?.company?.id || !/^REQ-[A-F0-9]{24}$/.test(normalized)) return null;
  const record = await queryOne(
    context,
    "IntakeSubmission",
    { publicReference: normalized },
    "publicReference kind status submittedAt company { id }",
  );
  if (!record || record.company?.id !== site.company.id) return null;
  return {
    publicReference: normalized,
    kind: text(record.kind),
    status: "received",
    submittedAt: new Date(String(record.submittedAt)).toISOString(),
  };
}
