import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { projectToolHref } from "@/features/platform/lib/navigation";
import type { ProcurementBidInvitationRegisterPage } from "@/features/platform/projects/data";
import { bidInvitationsHref } from "./register-navigation";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "invited", label: "Invited" },
  { value: "viewed", label: "Viewed" },
  { value: "intent_to_bid", label: "Intent to bid" },
  { value: "declined", label: "Declined" },
  { value: "submitted", label: "Submitted" },
] as const;

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

function dateLabel(label: string, value: string | null) {
  return value ? `${label} ${new Date(value).toLocaleDateString()}` : `${label} —`;
}

export function BidInvitationsRegister({ projectId, register, searchParams }: {
  projectId: string;
  register: ProcurementBidInvitationRegisterPage;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const firstItem = register.totalCount === 0 ? 0 : ((register.page - 1) * register.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + register.items.length - 1;

  return (
    <section className="border-y px-4 py-6 md:px-6" aria-labelledby="bid-invitations-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="bid-invitations-title" className="text-base font-semibold">Bid invitations</h2>
          <p className="text-sm text-muted-foreground">
            {register.totalCount === 0
              ? "No matching bid invitations."
              : `Showing ${firstItem}–${lastItem} of ${register.totalCount} matching invitations; newest first.`}
          </p>
        </div>
        <nav aria-label="Bid invitation pages" className="flex items-center gap-2 text-sm">
          {register.page > 1
            ? <Link rel="prev" href={bidInvitationsHref(projectId, searchParams, register.page - 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
          <span className="text-xs tabular-nums text-muted-foreground">Page {register.page} of {register.totalPages}</span>
          {register.page < register.totalPages
            ? <Link rel="next" href={bidInvitationsHref(projectId, searchParams, register.page + 1, register.status)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
            : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
        </nav>
      </div>

      <nav aria-label="Filter bid invitations by status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map(filter => {
          const active = filter.value === register.status;
          return (
            <Link
              key={filter.value}
              href={bidInvitationsHref(projectId, searchParams, 1, filter.value)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {register.items.length === 0 ? (
        <div className="border-t py-8 text-center text-sm text-muted-foreground">No bid invitations match this status.</div>
      ) : (
        <div className="divide-y border-y">
          {register.items.map(invitation => (
            <article key={invitation.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(12rem,18rem)] sm:items-center">
              <div className="min-w-0">
                {invitation.bidPackage
                  ? <Link href={`${projectToolHref(projectId, "")}/records/bid-package/${encodeURIComponent(invitation.bidPackage.id)}`} className="font-medium hover:underline">Bid package {invitation.bidPackage.number}</Link>
                  : <p className="font-medium">Bid package unavailable</p>}
              </div>
              <Badge variant="outline" className="w-fit">{readable(invitation.status)}</Badge>
              <p className="text-sm text-muted-foreground">{dateLabel("Sent", invitation.sentAt)} · {dateLabel("Responded", invitation.respondedAt)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
