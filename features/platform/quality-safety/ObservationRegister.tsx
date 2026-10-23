import { projectToolHref } from "@/features/platform/lib/navigation";
import type { SafetyObservationRegisterPage } from "@/features/platform/projects/data";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";

const observationStatusFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

function observationRegisterHref(
  projectId: string,
  page: number,
  status: string,
  inspectionPage: number,
  inspectionStatus: string,
  incidentPage: number,
  incidentStatus: string,
) {
  const query = new URLSearchParams();
  if (page > 1) query.set("observationPage", String(page));
  if (status !== "all") query.set("observationStatus", status);
  if (inspectionPage > 1) query.set("page", String(inspectionPage));
  if (inspectionStatus !== "all") query.set("status", inspectionStatus);
  if (incidentPage > 1) query.set("incidentPage", String(incidentPage));
  if (incidentStatus !== "all") query.set("incidentStatus", incidentStatus);
  const base = projectToolHref(projectId, "quality-safety");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export function ObservationRegister({
  projectId,
  register,
  inspectionPage,
  inspectionStatus,
  incidentPage,
  incidentStatus,
}: {
  projectId: string;
  register: SafetyObservationRegisterPage;
  inspectionPage: number;
  inspectionStatus: string;
  incidentPage: number;
  incidentStatus: string;
}) {
  return (
    <RegisterFrame
      id="observation-register" title="Safety observations" noun="observations" filters={observationStatusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => observationRegisterHref(projectId, page, status, inspectionPage, inspectionStatus, incidentPage, incidentStatus)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id}
          reference="Observation"
          title={item.reference}
          href={`${projectToolHref(projectId, "")}/records/observation/${encodeURIComponent(item.id)}`}
          status={item.status}
          meta={dateMeta("Observed", item.observedAt, "Observation date unavailable")}
        />
      ))}
    </RegisterFrame>
  );
}
