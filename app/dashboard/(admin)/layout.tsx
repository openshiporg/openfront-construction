export const dynamic = 'force-dynamic';

import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { getAdminMetaAction, getAuthenticatedUser } from '@/features/dashboard/actions';
import { getPlatformPermissions } from '@/features/platform/lib/platform-access';

export default async function ListLayout({ children }: { children: React.ReactNode }) {
  // Fetch adminMeta and user data server-side to avoid loading states
  const [adminMetaResponse, userResponse, platformPermissions] = await Promise.all([
    getAdminMetaAction(),
    getAuthenticatedUser(),
    getPlatformPermissions(),
  ]);
  
  const adminMeta = adminMetaResponse.success ? adminMetaResponse.data : null;
  const authenticatedItem = userResponse.success ? userResponse.data?.authenticatedItem : null;
  // The sidebar hides platform links by the same permissions the pages 404 on.
  const user = authenticatedItem ? { ...authenticatedItem, platformPermissions } : null;

  return (
    <DashboardLayout adminMeta={adminMeta} authenticatedItem={user}>
      {children}
    </DashboardLayout>
  );
}
