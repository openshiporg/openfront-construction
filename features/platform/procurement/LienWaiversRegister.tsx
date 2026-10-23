import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementLienWaiverRegisterPage } from "@/features/platform/projects/data";
import { readable } from "@/features/platform/components/kit";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";
import { procurementLienWaiversHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "received", label: "Received" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
] as const;

export function LienWaiversRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementLienWaiverRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <RegisterFrame
      id="procurement-lien-waivers" title="Lien waivers" noun="lien waivers" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => procurementLienWaiversHref(projectId, searchParams, page, status)}
    >
      {register.items.map(waiver => (
        <RegisterRow
          key={waiver.id}
          reference={readable(waiver.waiverType)}
          title={waiver.waiverNumber}
          href={`${projectToolHref(projectId, "")}/records/lien-waiver/${encodeURIComponent(waiver.id)}`}
          status={waiver.status}
          meta={dateMeta("Through", waiver.throughDate, "Through date unavailable")}
        />
      ))}
    </RegisterFrame>
  );
}
