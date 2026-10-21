import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { SubmittalRegisterPage, WorkItem } from "@/features/platform/projects/data";

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

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function SubmittalRegister({ projectId, register, rfiPage, rfiStatus }: {
  projectId: string;
  register: SubmittalRegisterPage;
  rfiPage: number;
  rfiStatus: string;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="submittal-register-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="submittal-register-title" className="text-base font-semibold">Submittals</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching submittals."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching submittals; recently updated first.`}
          </p>
        </div>
        <nav aria-label="Submittal pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={registerHref(projectId, register.page - 1, register.status, rfiPage, rfiStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={registerHref(projectId, register.page + 1, register.status, rfiPage, rfiStatus)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter submittals by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={registerHref(projectId, 1, filter.value, rfiPage, rfiStatus)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No submittals match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(item => (
            <article key={item.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.reference} · {item.owner}</p>
                <Link href={detailHref(projectId, item)} className="mt-1 inline-flex font-medium hover:underline">{item.title}</Link>
                <p className="mt-1 text-xs text-muted-foreground">{item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString()}` : "No due date"}</p>
              </div>
              <Badge variant="outline" className="w-fit">{readable(item.status)}</Badge>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
