import { projectToolHref } from "@/features/platform/lib/navigation";
import type { InspectionRegisterPage } from "@/features/platform/projects/data";
import { TransitionControl } from "@/features/platform/projects/components/TransitionControl";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";

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

export function InspectionRegister({ projectId, register, incidentPage, incidentStatus, observationPage, observationStatus }: {
  projectId: string;
  register: InspectionRegisterPage;
  incidentPage: number;
  incidentStatus: string;
  observationPage: number;
  observationStatus: string;
}) {
  const internal = register.audience === "internal";
  return (
    <RegisterFrame
      id="inspection-register" title="Inspections" noun="inspections" filters={inspectionStatusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => inspectionRegisterHref(projectId, page, status, incidentPage, incidentStatus, observationPage, observationStatus)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id}
          reference={[item.reference, item.owner].filter(Boolean).join(" · ")}
          title={item.title}
          href={internal ? `${projectToolHref(projectId, "")}/records/inspection/${encodeURIComponent(item.id)}` : null}
          status={item.status}
          meta={dateMeta("Scheduled", item.dueAt, "No scheduled date")}
          action={internal ? <TransitionControl projectId={projectId} item={item} /> : <span className="text-xs text-muted-foreground">Read only</span>}
        />
      ))}
    </RegisterFrame>
  );
}
