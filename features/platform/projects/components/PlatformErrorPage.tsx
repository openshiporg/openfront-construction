'use client';

import { RotateCcw } from "lucide-react";

import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";
import { StatusDot, pillClass, trackClass } from "@/features/platform/components/kit";

/** Platform error boundary. Keeps the family page header, so the sidebar
 * trigger stays available on phones while the content is unavailable. */
export function PlatformErrorPage({ reset }: { reset(): void }) {
  return <>
    <PageBreadcrumbs items={[
      { type: "link", label: "Dashboard", href: "" },
      { type: "page", label: "Unavailable" },
    ]} />
    <main className="grid min-h-[60vh] place-items-center px-4">
      <div role="alert" className="w-full max-w-md rounded-xl border bg-background p-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-lg font-semibold"><StatusDot tone="amber" />This page could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nothing was changed.</p>
        <span className={`${trackClass} mt-5`}><button type="button" className={pillClass("primary")} onClick={reset}><RotateCcw />Try again</button></span>
      </div>
    </main>
  </>;
}
