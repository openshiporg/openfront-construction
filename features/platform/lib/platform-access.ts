import { cache } from "react";
import { notFound } from "next/navigation";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { canOpenPlatformPage, platformPagePermissions } from "@/features/dashboard/lib/sidebarAccess";

const permissionFields = [...new Set(Object.values(platformPagePermissions).flat())];
type RoleFlags = Record<string, boolean | null> | null;
type AccessUser = {
  role: RoleFlags;
  companyMemberships: Array<{ status: string; role: RoleFlags }>;
  projectMemberships: Array<{ status: string; portalType: string; role: RoleFlags }>;
};

/**
 * Permissions the signed-in staff member holds from their own role, active
 * company memberships and active internal project grants (portal grants never
 * open staff pages). One request per render, shared by the sidebar and page guards.
 */
export const getPlatformPermissions = cache(async (): Promise<string[]> => {
  const roleQuery = `role { ${permissionFields.join(" ")} }`;
  const response = await keystoneClient<{ authenticatedItem: AccessUser | null }>(`
    query PlatformAccess {
      authenticatedItem {
        ... on User {
          ${roleQuery}
          companyMemberships(where: { status: { equals: active } }) { status ${roleQuery} }
          projectMemberships(where: { status: { equals: active }, portalType: { equals: internal } }) { status portalType ${roleQuery} }
        }
      }
    }
  `);
  const user = response.success ? response.data.authenticatedItem : null;
  if (!user) return [];
  const roles = [user.role, ...user.companyMemberships.map(entry => entry.role), ...user.projectMemberships.map(entry => entry.role)];
  return permissionFields.filter(permission => roles.some(role => role?.[permission] === true));
});

/** 404 for a platform page this session's roles cannot use (same rule that hides its sidebar link). */
export async function requirePlatformPage(slug: string) {
  if (!canOpenPlatformPage(slug, await getPlatformPermissions())) notFound();
}
