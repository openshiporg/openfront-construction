import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";

/** Platform loading state with the family page header and sidebar trigger. */
export function PlatformLoadingPage() {
  return <>
    <PageBreadcrumbs items={[
      { type: "link", label: "Dashboard", href: "" },
      { type: "page", label: "Platform" },
      { type: "page", label: "Loading" },
    ]} />
    <main className="animate-pulse px-4 py-8 md:px-6" aria-busy="true" aria-label="Loading"><div className="h-5 w-32 rounded bg-muted" /><div className="mt-3 h-8 w-72 max-w-full rounded bg-muted" /><div className="mt-8 grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 bg-background p-5"><div className="h-3 w-24 rounded bg-muted" /><div className="mt-4 h-6 w-32 rounded bg-muted" /></div>)}</div><div className="mt-8 space-y-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 rounded bg-muted" />)}</div></main>
  </>;
}
