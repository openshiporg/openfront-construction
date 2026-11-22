import { notFound } from "next/navigation";
import { getPlatformPermissions } from "@/features/platform/lib/platform-access";

/** Raw record lists (Administration > All records) are for store administrators; everyone else works from the platform pages. */
export default async function RawRecordsLayout({ children }: { children: React.ReactNode }) {
  if (!(await getPlatformPermissions()).includes("canManageSettings")) notFound();
  return children;
}
