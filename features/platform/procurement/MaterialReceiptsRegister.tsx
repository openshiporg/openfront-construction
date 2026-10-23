import { projectToolHref } from "@/features/platform/lib/navigation";
import type { MaterialReceiptRegisterPage } from "@/features/platform/projects/data";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";
import { materialReceiptsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "recorded", label: "Recorded" },
  { value: "accepted_with_exceptions", label: "Accepted with exceptions" },
  { value: "rejected", label: "Rejected" },
  { value: "voided", label: "Voided" },
] as const;

export function MaterialReceiptsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: MaterialReceiptRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <RegisterFrame
      id="material-receipts" title="Material receipts" noun="receipts" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => materialReceiptsHref(projectId, searchParams, page, status)}
    >
      {register.items.map(receipt => (
        <RegisterRow
          key={receipt.id}
          reference="Receipt"
          title={receipt.reference}
          href={`${projectToolHref(projectId, "")}/records/material-receipt/${encodeURIComponent(receipt.id)}`}
          status={receipt.status}
          meta={dateMeta("Received", receipt.receivedAt, "Received date unavailable")}
        />
      ))}
    </RegisterFrame>
  );
}
