import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { SafetyIncidentRegisterPage } from "@/features/platform/projects/data";

const incidentStatusFilters = [
  { value: "all", label: "All" },
  { value: "reported", label: "Reported" },
  { value: "investigating", label: "Investigating" },
  { value: "corrective_action", label: "Corrective action" },
  { value: "closed", label: "Closed" },
] as const;

function incidentRegisterHref(
  projectId: string,
  page: number,
  status: string,
  inspectionPage: number,
  inspectionStatus: string,
  observationPage: number,
  observationStatus: string,
) {
  const query = new URLSearchParams();
  if (page > 1) query.set("incidentPage", String(page));
  if (status !== "all") query.set("incidentStatus", status);
  if (inspectionPage > 1) query.set("page", String(inspectionPage));
  if (inspectionStatus !== "all") query.set("status", inspectionStatus);
  if (observationPage > 1) query.set("observationPage", String(observationPage));
  if (observationStatus !== "all") query.set("observationStatus", observationStatus);
  const base = projectToolHref(projectId, "quality-safety");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function IncidentRegister({ projectId, register, inspectionPage, inspectionStatus, observationPage, observationStatus }: {
  projectId: string;
  register: SafetyIncidentRegisterPage;
  inspectionPage: number;
  inspectionStatus: string;
  observationPage: number;
  observationStatus: string;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="incident-register-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="incident-register-title" className="text-base font-semibold">Safety incidents</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching incidents."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching incidents; newest records first.`}
          </p>
        </div>
        <nav aria-label="Incident pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={incidentRegisterHref(projectId, register.page - 1, register.status, inspectionPage, inspectionStatus, observationPage, observationStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={incidentRegisterHref(projectId, register.page + 1, register.status, inspectionPage, inspectionStatus, observationPage, observationStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter incidents by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {incidentStatusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={incidentRegisterHref(projectId, 1, filter.value, inspectionPage, inspectionStatus, observationPage, observationStatus)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No incidents match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(item => (
            <article key={item.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_10rem_12rem] md:items-center">
              <Link href={`${projectToolHref(projectId, "")}/records/incident/${encodeURIComponent(item.id)}`} className="font-medium hover:underline">
                Incident {item.reference}
              </Link>
              <Badge variant="outline" className="w-fit">{readable(item.status)}</Badge>
              <p className="text-sm text-muted-foreground">{item.occurredAt ? `Occurred ${new Date(item.occurredAt).toLocaleDateString()}` : "Occurrence date unavailable"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
