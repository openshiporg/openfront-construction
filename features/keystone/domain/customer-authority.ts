import type { KeystoneContext } from "@keystone-6/core/types";
import type { Session } from "../access";

/** Current authority at commit, not the request's hydrated permission snapshot.
 * SHARE locks participate with ordinary SQL/Keystone revocation UPDATE locks.
 */
export async function lockCustomerActor(context: KeystoneContext, companyId?: string): Promise<string> {
  const session = context.session as Session | undefined;
  if (!session?.itemId || session.authType !== "session" || !session.authSessionId) throw new Error("Sign in to continue");
  const actors: Array<{ id: string }> = await context.prisma.$queryRawUnsafe(
    `SELECT u.id FROM "User" u JOIN "AuthSession" s ON s."user" = u.id
     WHERE u.id = $1 AND s.id = $2 AND u."isActive" = true
       AND s."revokedAt" IS NULL AND s."expiresAt" > CURRENT_TIMESTAMP
     FOR SHARE OF u, s`, session.itemId, session.authSessionId,
  );
  if (actors.length !== 1) throw new Error("Sign in to continue");
  if (companyId) {
    const grants: Array<{ id: string }> = await context.prisma.$queryRawUnsafe(
      `SELECT m.id FROM "CompanyMembership" m JOIN "Role" r ON r.id = m.role
       JOIN "Company" c ON c.id = m.company
       WHERE m."user" = $1 AND m.company = $2 AND m.status = 'active'
         AND r."canManagePreconstruction" = true AND c.status = 'active'
       FOR SHARE OF m, r, c`, session.itemId, companyId,
    );
    if (grants.length !== 1) throw new Error("Request not found");
  }
  return session.itemId;
}
