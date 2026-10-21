import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hasCompanyPermission, hasProjectPermission, type Session } from "../access";
import { lockCurrentAuthority } from "../domain/current-authority";
import { normalizeScope, type ConstructionScope } from "../domain/scopes";
import { canAccessCompanyById, canAccessProjectById, queryById, type KeystoneQueryApi } from "../domain/tenancy";

export type ApiCredentialInput = {
  companyId: string;
  projectId?: string | null;
  name: string;
  scopes: string[];
  expiresAt?: string | null;
};

type DbApi = {
  createOne(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
  updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
};

type ApiContext = {
  session?: Session;
  prisma?: { user?: unknown; $queryRawUnsafe?<T = unknown>(sql: string, ...values: unknown[]): Promise<T> };
  sudo(): { query: Record<string, KeystoneQueryApi>; db: Record<string, DbApi> };
  transaction?<T>(callback: (context: ApiContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};

function requireSession(context: ApiContext): Session {
  if (!context.session?.itemId || context.session.authType === "api_key") {
    throw new Error("A live user session is required to administer API credentials");
  }
  return context.session;
}

function required(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function authorize(
  context: ApiContext,
  session: Session,
  companyId: string,
  projectId: string | null,
) {
  if (!hasCompanyPermission(session, companyId, "canManageAgents") ||
      !(await canAccessCompanyById(context, session.itemId, companyId, true))) {
    throw new Error("Not authorized to administer API credentials for this company");
  }
  if (projectId) {
    const project = await queryById(context, "Project", projectId, "id company { id }");
    if (project?.company?.id !== companyId ||
        !hasProjectPermission(session, companyId, projectId, "canManageAgents", true) ||
        !(await canAccessProjectById(context, session.itemId, projectId, true))) {
      throw new Error("Not authorized to administer API credentials for this project");
    }
  }
}

export async function issueApiCredential(
  _root: unknown,
  { input }: { input: ApiCredentialInput },
  context: ApiContext,
) {
  const session = requireSession(context);
  const companyId = required(input.companyId, "Company id", 200);
  const projectId = input.projectId ? required(input.projectId, "Project id", 200) : null;
  await authorize(context, session, companyId, projectId);
  const name = required(input.name, "Credential name", 160);
  const scopes = [...new Set(input.scopes.map(normalizeScope))];
  if (scopes.length === 0 || scopes.length > 12) throw new Error("Choose between one and twelve API scopes");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
    throw new Error("API credential expiry must be in the future");
  }
  if (!context.transaction) throw new Error("Transactional API credential context is required");

  const token = `ofc_live_${randomBytes(32).toString("base64url")}`;
  const tokenHash = digest(token);
  const tokenPrefix = token.slice(0, 16);
  const result = await context.transaction(async tx => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId, "canManageAgents");
    await authorize(tx, fresh, companyId, projectId);
    const sudo = tx.sudo();
    const credential = await sudo.db.ApiCredential.createOne({ data: {
      name,
      tokenPrefix,
      tokenHash,
      status: "active",
      scopes,
      expiresAt,
      owner: { connect: { id: session.itemId } },
      company: { connect: { id: companyId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
    } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: randomUUID(), actorType: "human", action: "issueApiCredential", status: "succeeded",
      targetType: "ApiCredential", targetId: credential.id, targetStatus: "active",
      reason: `Issue scoped API credential ${name}`,
      requestDigest: digest(JSON.stringify({ companyId, projectId, name, scopes, expiresAt: expiresAt?.toISOString() ?? null })),
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
      company: { connect: { id: companyId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      requestedBy: { connect: { id: session.itemId } }, actorUser: { connect: { id: session.itemId } },
    } });
    const payload = JSON.stringify({ schemaVersion: 1, credentialId: credential.id, companyId, projectId, scopes, tokenPrefix });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `issueApiCredential:${credential.id}`,
      eventType: "ApiCredential.issued", aggregateType: "ApiCredential", aggregateId: credential.id,
      canonicalPayload: payload, payloadDigest: digest(payload), status: "pending",
      company: { connect: { id: companyId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      agentAction: { connect: { id: action.id } },
    } });
    return { credentialId: credential.id, actionId: action.id };
  }, { timeout: 30_000 });
  return { success: true, ...result, token, tokenPrefix, scopes };
}

type CredentialRecord = Record<string, unknown> & {
  company?: { id?: string } | null;
  project?: { id?: string } | null;
};

export async function revokeApiCredential(
  _root: unknown,
  { id, reason }: { id: string; reason: string },
  context: ApiContext,
) {
  const session = requireSession(context);
  const credential = await queryById(context, "ApiCredential", required(id, "Credential id", 200), "id status tokenPrefix company { id } project { id }") as CredentialRecord | null;
  const companyId = credential?.company?.id;
  if (!credential?.id || !companyId) throw new Error("API credential not found");
  const projectId = credential.project?.id ?? null;
  await authorize(context, session, companyId, projectId);
  const normalizedReason = required(reason, "Revocation reason", 500);
  if (!context.transaction) throw new Error("Transactional API credential context is required");
  return context.transaction(async tx => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId, "canManageAgents");
    await authorize(tx, fresh, companyId, projectId);
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional credential lock is unavailable");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ApiCredential" WHERE id = $1 FOR UPDATE', String(credential.id));
    const sudo = tx.sudo();
    const current = await sudo.query.ApiCredential.findOne!({ where: { id: String(credential.id) }, query: "id status company { id } project { id }" }) as CredentialRecord | null;
    if (!current || current.company?.id !== companyId || (current.project?.id ?? null) !== projectId) throw new Error("API credential not found");
    if (current.status === "revoked") {
      const [receipt] = await sudo.query.AgentAction.findMany!({ where: { company: { id: { equals: companyId } }, action: { equals: "revokeApiCredential" }, targetId: { equals: String(credential.id) } }, take: 1, orderBy: [{ completedAt: "asc" }, { id: "asc" }], query: "id" });
      if (!receipt?.id) throw new Error("Revocation receipt is unavailable");
      return { success: true, credentialId: String(credential.id), actionId: String(receipt.id), replayed: true };
    }
    await sudo.db.ApiCredential.updateOne({ where: { id: String(credential.id) }, data: { status: "revoked", revokedAt: new Date() } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: randomUUID(), actorType: "human", action: "revokeApiCredential", status: "succeeded",
      targetType: "ApiCredential", targetId: String(credential.id), targetStatus: "revoked", reason: normalizedReason,
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
      company: { connect: { id: companyId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      requestedBy: { connect: { id: session.itemId } }, actorUser: { connect: { id: session.itemId } },
    } });
    const payload = JSON.stringify({ schemaVersion: 1, credentialId: credential.id, companyId, projectId, reason: normalizedReason });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `revokeApiCredential:${credential.id}:${action.id}`,
      eventType: "ApiCredential.revoked", aggregateType: "ApiCredential", aggregateId: String(credential.id),
      canonicalPayload: payload, payloadDigest: digest(payload), status: "pending",
      company: { connect: { id: companyId } },
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      agentAction: { connect: { id: action.id } },
    } });
    return { success: true, credentialId: String(credential.id), actionId: action.id, replayed: false };
  }, { timeout: 30_000 });
}

export type { ConstructionScope };
