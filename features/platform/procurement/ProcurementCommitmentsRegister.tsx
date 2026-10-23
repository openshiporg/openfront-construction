import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementCommitmentRegisterPage } from "@/features/platform/projects/data";
import { readable } from "@/features/platform/components/kit";
import { RegisterFrame, RegisterRow } from "@/features/platform/components/Register";
import { procurementCommitmentsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "out_for_signature", label: "Out for signature" },
  { value: "executed", label: "Executed" },
  { value: "complete", label: "Complete" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "terminated", label: "Terminated" },
] as const;

export function ProcurementCommitmentsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementCommitmentRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <RegisterFrame
      id="procurement-commitments" title="Subcontracts & POs" noun="commitments" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => procurementCommitmentsHref(projectId, searchParams, page, status)}
    >
      {register.items.map(commitment => (
        <RegisterRow
          key={commitment.id}
          reference={`${commitment.number} · ${readable(commitment.commitmentType)}`}
          title={commitment.title}
          href={`${projectToolHref(projectId, "")}/records/subcontract-po/${encodeURIComponent(commitment.id)}`}
          status={commitment.status}
        />
      ))}
    </RegisterFrame>
  );
}
