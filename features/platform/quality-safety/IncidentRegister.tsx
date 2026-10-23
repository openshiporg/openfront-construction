import { projectToolHref } from "@/features/platform/lib/navigation";
import type { SafetyIncidentRegisterPage } from "@/features/platform/projects/data";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";

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

export function IncidentRegister({ projectId, register, inspectionPage, inspectionStatus, observationPage, observationStatus }: {
  projectId: string;
  register: SafetyIncidentRegisterPage;
  inspectionPage: number;
  inspectionStatus: string;
  observationPage: number;
  observationStatus: string;
}) {
  return (
    <RegisterFrame
      id="incident-register" title="Safety incidents" noun="incidents" filters={incidentStatusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => incidentRegisterHref(projectId, page, status, inspectionPage, inspectionStatus, observationPage, observationStatus)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id}
          reference="Incident"
          title={item.reference}
          href={`${projectToolHref(projectId, "")}/records/incident/${encodeURIComponent(item.id)}`}
          status={item.status}
          meta={dateMeta("Occurred", item.occurredAt, "Occurrence date unavailable")}
        />
      ))}
    </RegisterFrame>
  );
}
