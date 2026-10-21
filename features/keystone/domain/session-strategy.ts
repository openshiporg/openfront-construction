import { createHash, randomBytes } from "node:crypto";

import { CONSTRUCTION_SCOPES, type ConstructionScope } from "./scopes";

import { statelessSessions } from "@keystone-6/core/session";

export type SessionRecord = {
  id: string;
  expiresAt?: string | Date | null;
  revokedAt?: string | Date | null;
  user?: ({ id?: string; isActive?: boolean } & Record<string, unknown>) | null;
};

type SessionContext = {
  sudo(): {
    query: {
      User: {
        findOne(args: { where: { id: string }; query: string }): Promise<{ id: string; isActive: boolean } | null>;
      };
      AuthSession: {
        findOne(args: { where: { sessionKey: string }; query: string }): Promise<SessionRecord | null>;
      };
      ApiCredential: {
        findOne(args: { where: { tokenHash: string }; query: string }): Promise<ApiCredentialRecord | null>;
      };
    };
    db: {
      AuthSession: {
        createOne(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
        updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
      };
      ApiCredential: {
        updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
      };
    };
  };
};

export type ApiCredentialRecord = {
  id: string;
  status?: string;
  scopes?: string[];
  expiresAt?: string | Date | null;
  revokedAt?: string | Date | null;
  owner?: { id?: string; isActive?: boolean } | null;
  company?: { id?: string } | null;
  project?: { id?: string; company?: { id?: string } | null } | null;
};

export type BaseSession = {
  itemId: string;
  listKey: string;
  authType?: "session" | "api_key";
  authSessionId?: string;
  apiCredential?: {
    id: string;
    companyId: string;
    projectId: string | null;
    scopes: ConstructionScope[];
  };
};

const allowedScopes = new Set<string>(CONSTRUCTION_SCOPES);

export function activeApiSessionFromRecord(
  record: ApiCredentialRecord | null,
  now = new Date(),
): BaseSession | undefined {
  const expiresAt = record?.expiresAt ? new Date(record.expiresAt) : null;
  const companyId = record?.company?.id;
  const ownerId = record?.owner?.id;
  const projectCompanyId = record?.project?.company?.id;
  const scopes = record?.scopes?.filter((scope): scope is ConstructionScope => allowedScopes.has(scope)) ?? [];
  if (
    !record || record.status !== "active" || record.revokedAt ||
    (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now)) ||
    !ownerId || record.owner?.isActive === false || !companyId || scopes.length === 0 ||
    (record.project && projectCompanyId !== companyId)
  ) return undefined;
  return {
    itemId: ownerId,
    listKey: "User",
    authType: "api_key",
    apiCredential: {
      id: record.id,
      companyId,
      projectId: record.project?.id ?? null,
      scopes,
    },
  };
}

function bearerToken(context: unknown): string | null {
  const req = (context as { req?: { headers?: { authorization?: string | string[] } } }).req;
  const raw = req?.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  const match = /^Bearer\s+(ofc_live_[A-Za-z0-9_-]{32,})$/i.exec(header.trim());
  return match?.[1] ?? "";
}

export function activeSessionFromRecord(record: SessionRecord | null, now = new Date()): BaseSession | undefined {
  const expiresAt = record?.expiresAt ? new Date(record.expiresAt) : null;
  const user = record?.user;
  if (!record || record.revokedAt || !expiresAt || expiresAt <= now || !user?.id || user.isActive === false) {
    return undefined;
  }
  return { itemId: user.id, listKey: "User" };
}

export function databaseSessions(options: { secret: string; maxAge: number }) {
  const cookie = statelessSessions<string>({ secret: options.secret, maxAge: options.maxAge });

  return {
    async get({ context }: { context: unknown }): Promise<BaseSession | undefined> {
      const sessionContext = context as SessionContext;
      const bearer = bearerToken(context);
      if (bearer !== null) {
        if (!bearer) return undefined;
        const tokenHash = createHash("sha256").update(bearer).digest("hex");
        const credential = await sessionContext.sudo().query.ApiCredential.findOne({
          where: { tokenHash },
          query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }",
        });
        const active = activeApiSessionFromRecord(credential);
        if (active && credential?.id) {
          await sessionContext.sudo().db.ApiCredential.updateOne({ where: { id: credential.id }, data: { lastUsedAt: new Date() } });
        }
        return active;
      }
      const sessionKey = await cookie.get({ context: context as never });
      if (!sessionKey) return undefined;
      const record = await sessionContext.sudo().query.AuthSession.findOne({
        where: { sessionKey },
        query: "id expiresAt revokedAt user { id isActive }",
      });
      const active = activeSessionFromRecord(record);
      return active ? { ...active, authType: "session", authSessionId: record!.id } : undefined;
    },

    async start({ context, data }: { context: unknown; data: BaseSession }): Promise<string> {
      const sessionContext = context as SessionContext;
      const user = await sessionContext.sudo().query.User.findOne({ where: { id: data.itemId }, query: "id isActive" });
      if (!user?.isActive) throw new Error("Inactive accounts cannot start a session");
      const sessionKey = randomBytes(32).toString("base64url");
      await sessionContext.sudo().db.AuthSession.createOne({
        data: {
          sessionKey,
          expiresAt: new Date(Date.now() + options.maxAge * 1000),
          user: { connect: { id: data.itemId } },
        },
      });
      return String(await cookie.start({ context: context as never, data: sessionKey }));
    },

    async end({ context }: { context: unknown }): Promise<void> {
      const sessionContext = context as SessionContext;
      const sessionKey = await cookie.get({ context: context as never });
      if (sessionKey) {
        const record = await sessionContext.sudo().query.AuthSession.findOne({
          where: { sessionKey },
          query: "id expiresAt revokedAt",
        });
        if (record && !record.revokedAt) {
          await sessionContext.sudo().db.AuthSession.updateOne({
            where: { id: record.id },
            data: { revokedAt: new Date() },
          });
        }
      }
      await cookie.end({ context: context as never });
    },
  };
}
