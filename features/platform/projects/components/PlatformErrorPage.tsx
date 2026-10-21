'use client';

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";

/** Platform error boundary. Keeps the family page header, so the sidebar
 * trigger stays available on phones while the content is unavailable. */
export function PlatformErrorPage({ reset }: { reset(): void }) {
  return <>
    <PageBreadcrumbs items={[
      { type: "link", label: "Dashboard", href: "" },
      { type: "page", label: "Platform" },
      { type: "page", label: "Unavailable" },
    ]} />
    <main className="grid min-h-[60vh] place-items-center px-4"><div className="max-w-md text-center"><AlertTriangle aria-hidden="true" className="mx-auto h-8 w-8 text-amber-600" /><h1 className="mt-4 text-xl font-semibold">This page could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">Nothing was changed. Try again, or choose another page from the menu.</p><Button type="button" className="mt-5 min-h-11" onClick={reset}>Try again</Button></div></main>
  </>;
}
