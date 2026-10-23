import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementRequestRegisterPage, WorkItem } from "@/features/platform/projects/data";
import { TransitionControl } from "@/features/platform/projects/components/TransitionControl";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";
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

function detailHref(projectId: string, item: WorkItem) {
  return `${projectToolHref(projectId, "")}/records/procurement-request/${encodeURIComponent(item.id)}`;
}

export function ProcurementRequestsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementRequestRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <RegisterFrame
      id="procurement-requests" title="Procurement requests" noun="requests" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => procurementRequestsHref(projectId, searchParams, page, status)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id}
          reference={[item.reference, item.owner].filter(Boolean).join(" · ")}
          title={item.title}
          href={detailHref(projectId, item)}
          status={item.status}
          meta={dateMeta("Needed by", item.dueAt, "No need-by date")}
          action={<TransitionControl projectId={projectId} item={item} />}
        />
      ))}
    </RegisterFrame>
  );
}
