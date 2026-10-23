import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";

/** Platform loading state with the family page header and sidebar trigger. */
export function PlatformLoadingPage() {
  return <>
    <PageBreadcrumbs items={[
      { type: "link", label: "Dashboard", href: "" },
      { type: "page", label: "Loading" },
    ]} />
    <main className="mx-auto w-full max-w-7xl animate-pulse px-4 py-6 md:px-6 md:py-8" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-40 rounded-full bg-muted" />
      <div className="mt-3 h-8 w-80 max-w-full rounded-lg bg-muted" />
      <div className="mt-6 h-9 w-full max-w-xl rounded-full bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 bg-background p-4"><div className="h-3 w-20 rounded-full bg-muted" /><div className="mt-3 h-5 w-24 rounded bg-muted" /></div>)}</div>
      <div className="mt-6 grid gap-3 rounded-xl border p-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 rounded-lg bg-muted" />)}</div>
    </main>
  </>;
}
