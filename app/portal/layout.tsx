import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "next-themes";

import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";
import { Logo } from "@/features/dashboard/components/Logo";
import { customerSignOut } from "@/features/storefront/account/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project portal" };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Each portal page signs out visitors back to the public sign-in with its own return path.
  const response = await getAuthenticatedUser();
  const user = response.success ? response.data?.authenticatedItem : null;
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <div className="border-b"><div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-8">
      <Logo />
      {user && <nav aria-label="Account" className="flex flex-wrap items-center gap-1 text-sm">
        <span className="hidden px-2 text-muted-foreground sm:inline">{user.name || user.email}</span>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-muted">Home</Link>
        <Link href="/account" className="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-muted">Account</Link>
        <form action={customerSignOut}><button className="inline-flex min-h-11 items-center rounded-md px-3 hover:bg-muted">Sign out</button></form>
      </nav>}
    </div></div>
    {children}
  </ThemeProvider>;
}
