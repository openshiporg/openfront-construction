/**
 * Sidebar filtering from capabilities the session already has: the role's
 * canAccessDashboard flag, Keystone's per-session list `isHidden` from admin meta,
 * and the permissions each platform page needs (`platformPagePermissions`).
 * Plain module: no 'use server' / 'use client', no @/ imports.
 */

type SidebarList = { path: string; isHidden?: boolean | null }
type SidebarUser = {
  role?: { canAccessDashboard?: boolean | null } | null
  /** Permissions granted by the global role or any active membership role; set by the dashboard layout. */
  platformPermissions?: readonly string[] | null
} | null | undefined

/**
 * Platform page slug → permissions, any one of which opens it. The sidebar hides
 * the link and the page's layout returns 404 from this same map, so a role never
 * sees a link it cannot use. Pages not listed (Portfolio, Projects) are open to
 * every dashboard user and scope their own rows.
 */
export const platformPagePermissions: Record<string, readonly string[]> = {
  setup: ['canManageOnboarding'],
  'store-settings': ['canManageSettings'],
  'payment-providers': ['canReadBilling', 'canManageBilling'],
  'trade-partners': ['canReadCompanies', 'canManageCompanies'],
  'cost-codes': ['canReadFinancials', 'canManageFinancials'],
  resources: ['canReadFieldOperations', 'canManageFieldOperations'],
  pipeline: ['canReadPreconstruction', 'canManagePreconstruction'],
  // The ServiceRequest list itself is filtered to canManagePreconstruction members.
  'service-requests': ['canManagePreconstruction'],
}

/** Only an explicit false hides navigation; an unknown user is left to the middleware. */
export function canUseDashboardNav(user: SidebarUser) {
  return user?.role?.canAccessDashboard !== false
}

export function canOpenPlatformPage(slug: string, permissions: readonly string[] | null | undefined) {
  const required = platformPagePermissions[slug]
  if (!required) return true
  // Unknown permissions (no layout data) fail closed for gated pages.
  return Boolean(permissions?.some((permission) => required.includes(permission)))
}

export function visibleSidebarLists<T extends SidebarList>(lists: T[], user: SidebarUser): T[] {
  if (!canUseDashboardNav(user)) return []
  return lists.filter((list) => !list.isHidden)
}

/**
 * A platform page is shown when the session holds one of its permissions and,
 * if its first segment is a list path, that list is not hidden.
 */
export function visiblePlatformItems<T extends { href: string }>(
  items: T[],
  lists: SidebarList[],
  user: SidebarUser
): T[] {
  if (!canUseDashboardNav(user)) return []
  const hiddenPaths = new Set(lists.filter((list) => list.isHidden).map((list) => list.path))
  return items.filter((item) => {
    const slug = item.href.split('/platform/')[1]?.split(/[/?#]/)[0]
    if (!slug) return true
    return !hiddenPaths.has(slug) && canOpenPlatformPage(slug, user?.platformPermissions)
  })
}
