export const CONSTRUCTION_SCOPES = [
  "companies:read",
  "companies:write",
  "projects:read",
  "projects:write",
  "preconstruction:read",
  "preconstruction:write",
  "financials:read",
  "financials:write",
  "contracts:read",
  "contracts:write",
  "execution:read",
  "execution:write",
  "documents:read",
  "documents:write",
  "field:read",
  "field:write",
  "safety:read",
  "safety:write",
  "billing:read",
  "billing:write",
  "agents:read",
  "agents:write",
  "agents:execute",
  "audit:read",
] as const;

export type ConstructionScope = (typeof CONSTRUCTION_SCOPES)[number];

const scopeSet = new Set<string>(CONSTRUCTION_SCOPES);

export function normalizeScope(scope: unknown): ConstructionScope {
  if (typeof scope !== "string" || scope.trim().length === 0) {
    throw new Error("Scope is required");
  }
  const normalized = scope.trim().toLowerCase();
  if (!scopeSet.has(normalized)) {
    throw new Error(`Unknown scope ${normalized}`);
  }
  return normalized as ConstructionScope;
}

export function scopeAllows(granted: ConstructionScope | string, required: ConstructionScope | string): boolean {
  const normalizedGrant = normalizeScope(granted);
  const normalizedRequired = normalizeScope(required);
  if (normalizedGrant === normalizedRequired) return true;

  const [grantDomain, grantVerb] = normalizedGrant.split(":");
  const [requiredDomain, requiredVerb] = normalizedRequired.split(":");
  return grantDomain === requiredDomain && grantVerb === "write" && requiredVerb === "read";
}

export type ScopeGrantPolicy = {
  status: string;
  scope: ConstructionScope | string;
  companyId: string;
  projectId: string | null;
  expiresAt: string | Date | null;
};

export type ScopeTarget = {
  requiredScope: ConstructionScope | string;
  companyId: string;
  projectId: string | null;
  now?: Date;
};

export function scopeGrantMatches(grant: ScopeGrantPolicy, target: ScopeTarget): boolean {
  if (grant.status !== "active") return false;
  if (grant.companyId !== target.companyId) return false;
  if (grant.projectId !== null && grant.projectId !== target.projectId) return false;
  if (!scopeAllows(grant.scope, target.requiredScope)) return false;

  if (grant.expiresAt) {
    const expiresAt = new Date(grant.expiresAt);
    const now = target.now ?? new Date();
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) return false;
  }

  return true;
}
