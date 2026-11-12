import { requirePlatformPage } from "@/features/platform/lib/platform-access";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePlatformPage("service-requests");
  return children;
}
