import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementLienWaiverRegisterPage } from "@/features/platform/projects/data";
import { procurementLienWaiversHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "received", label: "Received" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
] as const;

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function LienWaiversRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementLienWaiverRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="procurement-lien-waivers-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="procurement-lien-waivers-title" className="text-base font-semibold">Lien waivers</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching lien waivers."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching lien waivers; newest first.`}
          </p>
        </div>
        <nav aria-label="Lien waiver pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={procurementLienWaiversHref(projectId, searchParams, register.page - 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={procurementLienWaiversHref(projectId, searchParams, register.page + 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter lien waivers by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={procurementLienWaiversHref(projectId, searchParams, 1, filter.value)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No lien waivers match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(waiver => (
            <article key={waiver.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_12rem] sm:items-center">
              <div className="min-w-0">
                <Link href={`${projectToolHref(projectId, "")}/records/lien-waiver/${encodeURIComponent(waiver.id)}`} className="font-medium hover:underline">
                  {waiver.waiverNumber}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{readable(waiver.waiverType)}</p>
              </div>
              <Badge variant="outline" className="w-fit">{readable(waiver.status)}</Badge>
              <p className="text-sm text-muted-foreground">Through {waiver.throughDate ? new Date(waiver.throughDate).toLocaleDateString() : "date unavailable"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
