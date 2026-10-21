import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { InspectionRegisterPage } from "@/features/platform/projects/data";
import { TransitionControl } from "@/features/platform/projects/components/TransitionControl";

const inspectionStatusFilters = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function inspectionRegisterHref(projectId: string, page: number, status: string, incidentPage: number, incidentStatus: string, observationPage: number, observationStatus: string) {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (status !== "all") query.set("status", status);
  if (incidentPage > 1) query.set("incidentPage", String(incidentPage));
  if (incidentStatus !== "all") query.set("incidentStatus", incidentStatus);
  if (observationPage > 1) query.set("observationPage", String(observationPage));
  if (observationStatus !== "all") query.set("observationStatus", observationStatus);
  const base = projectToolHref(projectId, "quality-safety");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function InspectionRegister({ projectId, register, incidentPage, incidentStatus, observationPage, observationStatus }: {
  projectId: string;
  register: InspectionRegisterPage;
  incidentPage: number;
  incidentStatus: string;
  observationPage: number;
  observationStatus: string;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="inspection-register-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inspection-register-title" className="text-base font-semibold">Inspections</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching inspections."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching inspections; newest first.`}
          </p>
        </div>
        <nav aria-label="Inspection pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={inspectionRegisterHref(projectId, register.page - 1, register.status, incidentPage, incidentStatus, observationPage, observationStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={inspectionRegisterHref(projectId, register.page + 1, register.status, incidentPage, incidentStatus, observationPage, observationStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter inspections by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {inspectionStatusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={inspectionRegisterHref(projectId, 1, filter.value, incidentPage, incidentStatus, observationPage, observationStatus)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No inspections match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(item => (
            <article key={item.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_minmax(15rem,20rem)] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.reference} · {item.owner}</p>
                {register.audience === "internal"
                  ? <Link href={`${projectToolHref(projectId, "")}/records/inspection/${encodeURIComponent(item.id)}`} className="mt-1 inline-flex font-medium hover:underline">{item.title}</Link>
                  : <p className="mt-1 font-medium">{item.title}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{item.dueAt ? `Scheduled ${new Date(item.dueAt).toLocaleDateString()}` : "No scheduled date"}</p>
              </div>
              <Badge variant="outline" className="w-fit">{readable(item.status)}</Badge>
              {register.audience === "internal"
                ? <TransitionControl projectId={projectId} item={item} />
                : <span className="text-xs text-muted-foreground">Assigned inspection · read only</span>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
