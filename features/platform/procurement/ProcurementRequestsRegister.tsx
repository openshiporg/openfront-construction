import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementRequestRegisterPage, WorkItem } from "@/features/platform/projects/data";
import { TransitionControl } from "@/features/platform/projects/components/TransitionControl";
import { procurementRequestsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "ordered", label: "Ordered" },
  { value: "partially_received", label: "Partially received" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

function detailHref(projectId: string, item: WorkItem) {
  return `${projectToolHref(projectId, "")}/records/procurement-request/${encodeURIComponent(item.id)}`;
}

export function ProcurementRequestsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementRequestRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="procurement-requests-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="procurement-requests-title" className="text-base font-semibold">Procurement requests</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching requests."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching requests; newest requests first.`}
          </p>
        </div>
        <nav aria-label="Procurement request pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={procurementRequestsHref(projectId, searchParams, register.page - 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={procurementRequestsHref(projectId, searchParams, register.page + 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter procurement requests by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={procurementRequestsHref(projectId, searchParams, 1, filter.value)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No procurement requests match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(item => (
            <article key={item.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(15rem,20rem)] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.reference} · {item.owner}</p>
                <Link href={detailHref(projectId, item)} className="mt-1 inline-flex font-medium hover:underline">{item.title}</Link>
                <p className="mt-1 text-xs text-muted-foreground">{item.dueAt ? `Needed by ${new Date(item.dueAt).toLocaleDateString()}` : "No need-by date"}</p>
              </div>
              <Badge variant="outline" className="w-fit">{readable(item.status)}</Badge>
              <TransitionControl projectId={projectId} item={item} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
