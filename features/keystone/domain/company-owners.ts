import { getConnectedIds, type KeystoneContextLike, type KeystoneQueryRecord } from "./tenancy";

function storedOwnerId(record: KeystoneQueryRecord | null): string | null {
  const owner = record?.owner;
  if (owner === undefined || owner === null) return null;
  if (typeof owner !== "object" || !("id" in owner) || typeof owner.id !== "string") throw new Error("Owner lookup is incomplete");
  return owner.id;
}
export type CompanyOwnerValidation = {
  listKey: "AgentIdentity" | "ConstructionLead" | "ConstructionOpportunity";
  resolvedData: Record<string, unknown>;
  item?: { id: { toString(): string } } | null;
  context: KeystoneContextLike;
  required?: boolean;
  immutable?: boolean;
  addValidationError(message: string): void;
};

/** Validates affiliation only. Ownership never grants a role, scope or membership. */
export async function validateCompanyOwner(args: CompanyOwnerValidation): Promise<void> {
  const query = args.context.sudo().query;
  const current = args.item?.id
    ? await query[args.listKey].findOne!({ where: { id: args.item.id.toString() }, query: "id company { id } owner { id }" })
    : null;
  const companyConnections = getConnectedIds(args.resolvedData.company);
  if (args.resolvedData.company !== undefined && companyConnections.length !== 1) { args.addValidationError("Company must resolve to one existing tenant and cannot be disconnected"); return; }
  if (companyConnections.length > 1) { args.addValidationError("Company must resolve to one tenant"); return; }
  const companyId = companyConnections[0] ?? current?.company?.id;
  if (current?.company?.id && companyId !== current.company.id) { args.addValidationError("The record company cannot be changed"); return; }
  if (!companyId) { args.addValidationError("A company is required to validate the owner"); return; }
  const originalOwnerId = storedOwnerId(current);
  let ownerId = originalOwnerId;
  const change = args.resolvedData.owner;
  if (change === null) ownerId = null;
  else if (change !== undefined) {
    const disconnected = typeof change === "object" && "disconnect" in change && change.disconnect === true;
    const connections = getConnectedIds(change);
    if (disconnected && connections.length === 0) ownerId = null;
    else if (!disconnected && connections.length === 1) ownerId = connections[0];
    else { args.addValidationError("Owner must resolve to one existing user or an explicit disconnect"); return; }
  }
  if (args.immutable && current && ownerId !== originalOwnerId) {
    args.addValidationError("Agent identity owner cannot be changed"); return;
  }
  // An affiliation failure must not strand an existing unsafe identity: allow
  // restriction only, never reassignment/reactivation or creation by exception.
  if (args.listKey === "AgentIdentity" && current && ownerId === originalOwnerId &&
      ["revoked", "suspended"].includes(String(args.resolvedData.status))) return;
  if (!ownerId) {
    if (args.required) args.addValidationError("Agent identity owner is required");
    return;
  }
  // The enclosing model operation authorizes the company. This privileged read
  // only checks affiliation; it exposes no user data and writes no memberships.
  const user = await query.User.findOne!({ where: { id: ownerId }, query: "id isActive companyMemberships(where: { status: { equals: active } }) { status company { id } } projectMemberships(where: { status: { equals: active } }) { status project { id company { id } } }" });
  const affiliated = user?.companyMemberships?.some(member => member.status === "active" && member.company?.id === companyId) ||
    user?.projectMemberships?.some(member => member.status === "active" && member.project?.company?.id === companyId);
  if (user?.isActive !== true || !affiliated) args.addValidationError("Owner must be an active user affiliated with the selected company");
}
