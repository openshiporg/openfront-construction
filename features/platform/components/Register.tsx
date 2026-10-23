import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { EmptyState, Pager, SegmentTabs, TitleStatus, formatDate } from "./kit";

export type RegisterFilter = { value: string; label: string };

/**
 * One frame for every paged project register: title and count, status filters
 * as a pill track, pager, and rows. The register supplies its own hrefs so each
 * keeps the query parameters it already owns.
 */
export function RegisterFrame({ id, title, noun, page, pageSize, totalCount, totalPages, status, filters, hrefFor, itemCount, children, toolbar }: {
  id: string;
  title: string;
  noun: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  filters: readonly RegisterFilter[];
  hrefFor(page: number, status: string): string;
  itemCount: number;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = first === 0 ? 0 : first + itemCount - 1;
  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0 overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{totalCount === 0 ? `No ${noun}` : `${first}–${last} of ${totalCount}`}</p>
        </div>
        <Pager label={`${title} pages`} page={page} totalPages={totalPages} prevHref={hrefFor(page - 1, status)} nextHref={hrefFor(page + 1, status)} />
      </div>
      <div className="grid gap-3 px-4 pt-3 md:px-5">
        <SegmentTabs label={`Filter ${title.toLowerCase()} by status`} tabs={filters.map(filter => ({ key: filter.value, label: filter.label, href: hrefFor(1, filter.value), active: filter.value === status }))} />
        {toolbar}
      </div>
      <div className="p-4 pt-3 md:px-5">
        {itemCount === 0 ? <EmptyState compact title={`No ${noun} in this view`} /> : <ul className="divide-y overflow-hidden rounded-lg border">{children}</ul>}
      </div>
    </section>
  );
}

/** A register row: reference line, title with its status on the same line, meta and an optional action. */
export function RegisterRow({ reference, title, href, status, statusLabel, meta, action }: {
  reference?: ReactNode;
  title: ReactNode;
  href?: string | null;
  status: string;
  statusLabel?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className={cn("grid min-w-0 gap-3 px-3 py-3 transition-colors hover:bg-muted/30 md:px-4", action && "lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-center")}>
      <div className="min-w-0">
        {reference ? <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{reference}</p> : null}
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {href ? <Link href={href} className="min-w-0 break-words text-sm font-medium underline-offset-4 hover:underline">{title}</Link> : <span className="min-w-0 break-words text-sm font-medium">{title}</span>}
          <TitleStatus status={status} label={statusLabel} />
        </div>
        {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {action ? <div className="min-w-0">{action}</div> : null}
    </li>
  );
}

export function dateMeta(label: string, value: string | null | undefined, missing: string) {
  return value ? `${label} ${formatDate(value)}` : missing;
}
