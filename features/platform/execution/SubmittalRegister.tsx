import { projectToolHref } from "@/features/platform/lib/navigation";
import type { SubmittalRegisterPage, WorkItem } from "@/features/platform/projects/data";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "revise_resubmit", label: "Revise and resubmit" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "voided", label: "Voided" },
] as const;

function registerHref(projectId: string, page: number, status: string, rfiPage: number, rfiStatus: string) {
  const query = new URLSearchParams();
  if (page > 1) query.set("submittalPage", String(page));
  if (status !== "all") query.set("submittalStatus", status);
  if (rfiPage > 1) query.set("rfiPage", String(rfiPage));
  if (rfiStatus !== "all") query.set("rfiStatus", rfiStatus);
  const base = projectToolHref(projectId, "execution");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

function detailHref(projectId: string, item: WorkItem) {
  return `${projectToolHref(projectId, "")}/records/submittal/${encodeURIComponent(item.id)}`;
}

export function SubmittalRegister({ projectId, register, rfiPage, rfiStatus }: {
  projectId: string;
  register: SubmittalRegisterPage;
  rfiPage: number;
  rfiStatus: string;
}) {
  return (
    <RegisterFrame
      id="submittal-register" title="Submittals" noun="submittals" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => registerHref(projectId, page, status, rfiPage, rfiStatus)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id}
          reference={[item.reference, item.owner].filter(Boolean).join(" · ")}
          title={item.title}
          href={detailHref(projectId, item)}
          status={item.status}
          meta={dateMeta("Due", item.dueAt, "No due date")}
        />
      ))}
    </RegisterFrame>
  );
}
