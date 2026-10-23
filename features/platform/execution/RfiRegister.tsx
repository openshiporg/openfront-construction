import { projectToolHref } from "@/features/platform/lib/navigation";
import type { RfiRegisterPage } from "@/features/platform/projects/data";
import { RegisterFrame, RegisterRow, dateMeta } from "@/features/platform/components/Register";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
  { value: "voided", label: "Voided" },
] as const;

function registerHref(projectId: string, page: number, status: string, submittalPage: number, submittalStatus: string) {
  const query = new URLSearchParams();
  if (page > 1) query.set("rfiPage", String(page));
  if (status !== "all") query.set("rfiStatus", status);
  if (submittalPage > 1) query.set("submittalPage", String(submittalPage));
  if (submittalStatus !== "all") query.set("submittalStatus", submittalStatus);
  const base = projectToolHref(projectId, "execution");
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export function RfiRegister({ projectId, register, submittalPage, submittalStatus }: {
  projectId: string;
  register: RfiRegisterPage;
  submittalPage: number;
  submittalStatus: string;
}) {
  return (
    <RegisterFrame
      id="rfi-register" title="RFIs" noun="RFIs" filters={statusFilters}
      page={register.page} pageSize={register.pageSize} totalCount={register.totalCount} totalPages={register.totalPages} status={register.status}
      itemCount={register.items.length} hrefFor={(page, status) => registerHref(projectId, page, status, submittalPage, submittalStatus)}
    >
      {register.items.map(item => (
        <RegisterRow
          key={item.id ?? item.number}
          reference={`RFI ${item.number}`}
          title={item.title}
          href={register.audience === "internal" && item.id ? `${projectToolHref(projectId, "")}/records/rfi/${encodeURIComponent(item.id)}` : null}
          status={item.status}
          meta={dateMeta("Due", item.dueAt, "No due date")}
        />
      ))}
    </RegisterFrame>
  );
}
