import { createHash, randomUUID } from "node:crypto";
import type { KeystoneContext } from "@keystone-6/core/types";
import { lockCustomerActor } from "../domain/customer-authority";
import { getTrustedPublicSiteKey } from "../domain/public-site";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const clean = (value: unknown, label: string, max: number, min = 1) => {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label} is invalid`);
  return value.trim();
};
const selection = "id reference serviceTitle serviceSlug scope status version currencyCode quoteMinor quoteTerms expiresAt acceptedAt acceptedSnapshot createdAt customer { id } company { id name }";

export type ServiceRequestInput = {
  operation: string;
  id?: string | null;
  serviceSlug?: string | null;
  scope?: string | null;
  expectedVersion?: number | null;
  amountMinor?: string | null;
  terms?: string | null;
  expiresAt?: string | null;
  idempotencyKey: string;
};

export async function registerConstructionCustomer(_root: unknown, { name, email, password }: { name: string; email: string; password: string }, context: KeystoneContext) {
  const identity = clean(email, "Email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) throw new Error("Email is invalid");
  const customerName = clean(name, "Name", 200);
  if (typeof password !== "string" || password.length < 10 || password.length > 1000) throw new Error("Password must have at least 10 characters");
  // Ordinary customer signup, not a platform operator signup/role grant. No
  // invitation, historical order, or intake is claimed through an email match.
  // Account creation is a customer identity flow: it follows publication of the
  // contractor's website, not whether new quote requests are currently accepted.
  const site = await context.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() } });
  if (site?.status !== "published") throw new Error("Customer registration is unavailable");
  try {
    await context.sudo().db.User.createOne({ data: { name: customerName, email: identity, password, onboardingStatus: "dismissed" } });
  } catch {
    throw new Error("Account could not be created. Sign in if you already have an account.");
  }
  return { success: true };
}

function customerRequestScope(context: KeystoneContext, operator: boolean) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session?.authType !== "session") throw new Error("Sign in to continue");
  // Normal Keystone access composes owner OR current tenant membership. An
  // operator queue additionally excludes rows visible only by customer ownership.
  return operator
    ? { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: actorId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } }
    : { customer: { id: { equals: actorId } } };
}

export async function constructionCustomerRequests(_root: unknown, { operator = false, skip = 0, take = 100 }: { operator?: boolean | null; skip?: number | null; take?: number | null }, context: KeystoneContext) {
  const offset = Number.isSafeInteger(skip) && Number(skip) > 0 ? Number(skip) : 0;
  const limit = Number.isSafeInteger(take) && Number(take) > 0 ? Math.min(Number(take), 100) : 100;
  return context.query.ServiceRequest.findMany({
    where: customerRequestScope(context, Boolean(operator)),
    skip: offset, take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], query: selection,
  });
}

export async function constructionCustomerRequestCount(_root: unknown, { operator = false }: { operator?: boolean | null }, context: KeystoneContext) {
  return context.query.ServiceRequest.count({ where: customerRequestScope(context, Boolean(operator)) });
}

export async function constructionCustomerRequest(_root: unknown, { id }: { id: string }, context: KeystoneContext) {
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const row = await context.query.ServiceRequest.findOne({ where: { id }, query: selection });
  if (!row || row.customer?.id !== context.session.itemId) throw new Error("Request not found");
  return row;
}

export async function commandConstructionRequest(_root: unknown, { input }: { input: ServiceRequestInput }, context: KeystoneContext) {
  const operation = clean(input.operation, "Operation", 30);
  if (!["request", "quote", "accept", "cancel"].includes(operation)) throw new Error("Operation is invalid");
  const key = clean(input.idempotencyKey, "Request key", 200);
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const actorId = context.session.itemId;
  const commandDigest = hash([operation, input.id || "", input.serviceSlug || "", input.scope || "", input.expectedVersion ?? null, input.amountMinor || "", input.terms || "", input.expiresAt || ""]);
  return context.transaction(async tx => {
    await lockCustomerActor(tx);
    if (operation === "request") {
      const slug = clean(input.serviceSlug, "Service", 100);
      const scope = clean(input.scope, "Project scope", 4000, 20);
      const candidate = await tx.prisma.publicService.findFirst({ where: { slug, status: "published", site: { siteKey: getTrustedPublicSiteKey(), status: "published", acceptingInquiries: true } }, select: { companyId: true } });
      if (!candidate?.companyId) throw new Error("Service is unavailable");
      // Same parent-first lock order as publication/brand edits; no JOIN lock
      // inversion when a service is withdrawn concurrently with a request.
      await tx.prisma.$queryRawUnsafe('SELECT id FROM "Company" WHERE id = $1 AND status = \'active\' FOR SHARE', candidate.companyId);
      const services: Array<{ id: string; title: string; company: string }> = await tx.prisma.$queryRawUnsafe(
        `SELECT s.id, s.title, s.company FROM "PublicService" s
         JOIN "PublicSiteProfile" p ON p.id = s.site JOIN "Company" c ON c.id = s.company
         WHERE s.slug = $1 AND s.status = 'published' AND p."siteKey" = $2
           AND p.status = 'published' AND p."acceptingInquiries" = true AND c.status = 'active'
           AND c."publicSiteProfile" = p.id FOR SHARE OF s, p`, slug, getTrustedPublicSiteKey(),
      );
      const service = services[0];
      if (services.length !== 1 || !service) throw new Error("Service is unavailable");
      const requestKey = hash([actorId, service.id, key]);
      await tx.prisma.$queryRawUnsafe('SELECT 1::int FROM pg_advisory_xact_lock(hashtextextended($1, 0))', requestKey);
      const replay = await tx.prisma.serviceRequest.findUnique({ where: { requestKey } });
      if (replay) {
        if (replay.requestDigest !== commandDigest || replay.customerId !== actorId) throw new Error("Request key was used for different details");
        return tx.query.ServiceRequest.findOne({ where: { id: replay.id }, query: selection });
      }
      const created = await tx.sudo().db.ServiceRequest.createOne({ data: {
        reference: `SR-${randomUUID().slice(0, 8).toUpperCase()}`, requestKey, requestDigest: commandDigest,
        serviceTitle: service.title, serviceSlug: slug, scope, status: "requested", version: 0,
        currencyCode: "USD", customer: { connect: { id: actorId } }, company: { connect: { id: service.company } }, service: { connect: { id: service.id } },
      } });
      await tx.sudo().db.ServiceRequestEvent.createOne({ data: {
        eventKey: hash([actorId, created.id, key]), commandDigest, action: operation, fromStatus: "", toStatus: "requested", version: 0,
        snapshot: { serviceTitle: service.title, serviceSlug: slug, scope, currencyCode: "USD" },
        actor: { connect: { id: actorId } }, request: { connect: { id: created.id } },
      } });
      return tx.query.ServiceRequest.findOne({ where: { id: String(created.id) }, query: selection });
    }
    const id = clean(input.id, "Request", 200);
    // Prove scoped visibility before privileged row locking/readback.
    // db readback retains internal FK scalars while enforcing List access.
    // GraphQL relation projections can legitimately redact User/Company fields
    // even when this request is visible, so they are not an authority source.
    const visible = await tx.db.ServiceRequest.findOne({ where: { id } });
    if (!visible?.companyId || !visible.customerId) throw new Error("Request not found");
    const owner = visible.customerId === actorId;
    if (operation === "quote" || !owner) await lockCustomerActor(tx, String(visible.companyId));
    if (operation === "accept" && !owner) throw new Error("Request not found");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ServiceRequest" WHERE id = $1 FOR UPDATE', id);
    const row = await tx.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row || row.companyId !== visible.companyId || row.customerId !== visible.customerId) throw new Error("Request not found");
    const eventKey = hash([actorId, id, key]);
    const replay = await tx.prisma.serviceRequestEvent.findUnique({ where: { eventKey } });
    if (replay) {
      if (replay.commandDigest !== commandDigest) throw new Error("Request key was used for different details");
      return tx.query.ServiceRequest.findOne({ where: { id }, query: selection });
    }
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion !== row.version) throw new Error("Request changed. Reload and review the current terms.");
    const version = row.version + 1;
    let data: Record<string, unknown>;
    if (operation === "quote") {
      if (!["requested", "quoted"].includes(row.status)) throw new Error("Accepted or cancelled requests cannot be repriced");
      const amount = clean(input.amountMinor, "Quote amount", 16);
      if (!/^[1-9]\d*$/.test(amount) || BigInt(amount) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Quote amount is outside the supported integer range");
      const terms = clean(input.terms, "Quote terms", 4000, 20);
      const expiresAt = new Date(clean(input.expiresAt, "Quote expiry", 40));
      if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() || expiresAt.getTime() > Date.now() + 90 * 86400000) throw new Error("Quote expiry must be within the next 90 days");
      data = { quoteMinor: BigInt(amount), quoteTerms: terms, expiresAt, status: "quoted", version };
    } else if (operation === "accept") {
      if (row.status !== "quoted" || !row.expiresAt || row.expiresAt <= new Date() || row.quoteMinor <= BigInt(0)) throw new Error("Quote is no longer available");
      // C13: frozen accepted commercial terms, never re-read live service text.
      data = { status: "payment_pending", version, acceptedAt: new Date(), acceptedSnapshot: {
        serviceTitle: row.serviceTitle, serviceSlug: row.serviceSlug, scope: row.scope,
        quantity: 1, unit: "project scope", unitPriceMinor: row.quoteMinor.toString(), totalMinor: row.quoteMinor.toString(),
        currencyCode: row.currencyCode, terms: row.quoteTerms, quoteVersion: row.version, expiresAt: row.expiresAt.toISOString(),
      } };
    } else {
      if (row.status === "cancelled") throw new Error("Request is already cancelled");
      data = { status: "cancelled", version };
    }
    await tx.sudo().db.ServiceRequest.updateOne({ where: { id }, data });
    await tx.sudo().db.ServiceRequestEvent.createOne({ data: {
      eventKey, commandDigest, action: operation, fromStatus: row.status, toStatus: String(data.status), version,
      snapshot: JSON.parse(JSON.stringify(data, (_key, value) => typeof value === "bigint" ? value.toString() : value)),
      actor: { connect: { id: actorId } }, request: { connect: { id } },
    } });
    return tx.query.ServiceRequest.findOne({ where: { id }, query: selection });
  }, { timeout: 15000 });
}

/** Operator queue rows with the customer's contact details. Rows come from the
 * operator-scoped query; contact is read only for those rows and is never part
 * of the customer projection. */
export async function constructionOperatorRequests(_root: unknown, { skip = 0, take = 25 }: { skip?: number | null; take?: number | null }, context: KeystoneContext) {
  const rows = await constructionCustomerRequests(_root, { operator: true, skip, take }, context);
  const customerIds = [...new Set(rows.map(row => row.customer?.id).filter((id): id is string => typeof id === "string"))];
  const customers = customerIds.length
    ? await context.sudo().query.User.findMany({ where: { id: { in: customerIds } }, query: "id name email phone" })
    : [];
  const byId = new Map(customers.map(customer => [String(customer.id), customer]));
  return rows.map(row => {
    const customer = byId.get(String(row.customer?.id ?? ""));
    return {
      request: row,
      customerName: String(customer?.name ?? ""),
      customerEmail: String(customer?.email ?? ""),
      customerPhone: customer?.phone ? String(customer.phone) : null,
    };
  });
}
