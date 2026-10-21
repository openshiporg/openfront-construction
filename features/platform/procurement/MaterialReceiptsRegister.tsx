import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { MaterialReceiptRegisterPage } from "@/features/platform/projects/data";
import { materialReceiptsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "recorded", label: "Recorded" },
  { value: "accepted_with_exceptions", label: "Accepted with exceptions" },
  { value: "rejected", label: "Rejected" },
  { value: "voided", label: "Voided" },
] as const;

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export function MaterialReceiptsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: MaterialReceiptRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="material-receipts-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="material-receipts-title" className="text-base font-semibold">Material receipts</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching receipts."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching receipts; newest receipts first.`}
          </p>
        </div>
        <nav aria-label="Material receipt pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={materialReceiptsHref(projectId, searchParams, register.page - 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={materialReceiptsHref(projectId, searchParams, register.page + 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter material receipts by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={materialReceiptsHref(projectId, searchParams, 1, filter.value)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No material receipts match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(receipt => (
            <article key={receipt.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_12rem] sm:items-center">
              <Link href={`${projectToolHref(projectId, "")}/records/material-receipt/${encodeURIComponent(receipt.id)}`} className="font-medium hover:underline">
                Receipt {receipt.reference}
              </Link>
              <Badge variant="outline" className="w-fit">{readable(receipt.status)}</Badge>
              <p className="text-sm text-muted-foreground">{receipt.receivedAt ? `Received ${new Date(receipt.receivedAt).toLocaleDateString()}` : "Received date unavailable"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
