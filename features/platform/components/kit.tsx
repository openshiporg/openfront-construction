import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";
import { pillClass, trackClass, type PillVariant } from "./pill";

export { pillClass, trackClass, fieldLabelClass, inputClass, selectClass, textareaClass } from "./pill";

/*
 * Construction platform kit. One visual language for every operator screen:
 * status dots sit on the title line, in-page buttons are raised pills in a
 * recessed track, money and references are tabular, and every list has an
 * explicit empty state.
 */

export type Tone = "emerald" | "amber" | "blue" | "orange" | "rose" | "zinc" | "violet" | "sky";

const dotTones: Record<Tone, string> = {
  emerald: "bg-emerald-500 outline-emerald-100 dark:bg-emerald-400 dark:outline-emerald-900/50",
  amber: "bg-amber-500 outline-amber-100 dark:bg-amber-400 dark:outline-amber-900/50",
  blue: "bg-blue-500 outline-blue-100 dark:bg-blue-400 dark:outline-blue-900/50",
  orange: "bg-orange-500 outline-orange-100 dark:bg-orange-400 dark:outline-orange-900/50",
  rose: "bg-rose-500 outline-rose-100 dark:bg-rose-400 dark:outline-rose-900/50",
  zinc: "bg-zinc-400 outline-zinc-100 dark:bg-zinc-500 dark:outline-zinc-800/60",
  violet: "bg-violet-500 outline-violet-100 dark:bg-violet-400 dark:outline-violet-900/50",
  sky: "bg-sky-500 outline-sky-100 dark:bg-sky-400 dark:outline-sky-900/50",
};

const toneByStatus: Record<string, Tone> = {
  // Done, accepted or in force
  active: "emerald", approved: "emerald", approved_as_noted: "emerald", executed: "emerald", complete: "emerald",
  completed: "emerald", passed: "emerald", received: "emerald", accepted: "emerald", answered: "emerald", won: "emerald",
  settled: "emerald", paid: "emerald", issued: "emerald", awarded: "emerald", resolved: "emerald", published: "emerald",
  // Waiting on someone
  pending: "amber", submitted: "amber", under_review: "amber", pricing: "amber", requested: "amber", quoted: "amber",
  out_for_signature: "amber", intent_to_bid: "amber", investigating: "amber", ordered: "amber", partially_received: "amber",
  partially_paid: "amber", payment_pending: "amber", ready_for_verification: "amber", negotiating: "amber", estimating: "amber",
  go_no_go: "amber", qualifying: "sky", accepted_with_exceptions: "amber", reported: "amber",
  // Directory and catalog states
  prospective: "sky", available: "emerald", in_use: "blue", blocked: "rose", out_of_service: "rose",
  inactive: "zinc", retired: "zinc", discontinued: "zinc",
  // Live work
  open: "blue", scheduled: "blue", invited: "blue", viewed: "blue", assigned: "blue", in_progress: "blue", planning: "sky",
  corrective_action: "orange", revise_resubmit: "orange", delayed: "orange", on_hold: "orange", superseded: "zinc",
  // Stopped
  rejected: "rose", failed: "rose", cancelled: "rose", voided: "rose", lost: "rose", declined: "rose", terminated: "rose",
  expired: "rose", reversed: "rose",
  // Quiet
  draft: "zinc", closed: "zinc", archived: "zinc", not_started: "zinc", recorded: "zinc",
};

export function statusTone(status: string | null | undefined): Tone {
  return toneByStatus[String(status ?? "").toLowerCase()] ?? "zinc";
}

export function readable(value: string | null | undefined) {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full outline-3 -outline-offset-1", dotTones[tone], className)} />;
}

/** Dot plus label, sized to sit on a title line. */
export function TitleStatus({ status, tone, label }: { status?: string | null; tone?: Tone; label?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground">
      <StatusDot tone={tone ?? statusTone(status)} />
      {label ?? readable(status)}
    </span>
  );
}

export function Track({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div role={label ? "group" : undefined} aria-label={label} className={cn(trackClass, className)}>{children}</div>;
}

export function PillLink({ href, children, variant = "raised", size }: { href: string; children: ReactNode; variant?: PillVariant; size?: "sm" | "md" }) {
  return <Link href={href} className={pillClass(variant, size)}>{children}</Link>;
}

/** Filter tabs: the active tab is the raised pill; the rest sit quietly in the track. */
export function SegmentTabs({ label, tabs, size = "sm" }: {
  label: string;
  size?: "sm" | "md";
  tabs: Array<{ key: string; label: string; href: string; active: boolean; count?: number | null }>;
}) {
  return (
    <nav aria-label={label} className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className={cn(trackClass, "max-w-none")}>
        {tabs.map(tab => (
          <Link key={tab.key} href={tab.href} aria-current={tab.active ? "page" : undefined} className={pillClass(tab.active ? "raised" : "quiet", size)}>
            {tab.label}
            {tab.count !== undefined && tab.count !== null ? <span className="tabular-nums opacity-60">{tab.count}</span> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Previous / next as pills in a track, with the page count between them. */
export function Pager({ label, page, totalPages, prevHref, nextHref }: { label: string; page: number; totalPages: number; prevHref?: string | null; nextHref?: string | null }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className={trackClass}>
      {page > 1 && prevHref
        ? <Link rel="prev" href={prevHref} className={pillClass("raised", "sm")}><ArrowLeft />Previous</Link>
        : <span aria-disabled="true" className={pillClass("quiet", "sm")}><ArrowLeft />Previous</span>}
      <span className="px-2 text-xs tabular-nums text-muted-foreground">{page} / {totalPages}</span>
      {page < totalPages && nextHref
        ? <Link rel="next" href={nextHref} className={pillClass("raised", "sm")}>Next<ArrowRight /></Link>
        : <span aria-disabled="true" className={pillClass("quiet", "sm")}>Next<ArrowRight /></span>}
    </nav>
  );
}

export type Crumb = { type: "link" | "page"; label: string; href?: string };

/** Breadcrumb hrefs are relative to the dashboard base path. */
export function PlatformPage({ breadcrumbs, children, width = "wide" }: { breadcrumbs: Crumb[]; children: ReactNode; width?: "wide" | "narrow" }) {
  return (
    <section className="flex min-w-0 flex-col">
      <PageBreadcrumbs items={[{ type: "link", label: "Dashboard", href: "" }, ...breadcrumbs]} />
      <div className={cn("mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-6 md:px-6 md:py-8", width === "wide" ? "max-w-7xl" : "max-w-4xl")}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, status, meta, actions, icon: Icon }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {Icon ? <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-[18px]" /></span> : null}
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
          {status}
        </div>
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({ items, label }: { label?: string; items: Array<{ key?: string; label: string; value: ReactNode; tone?: Tone; href?: string }> }) {
  if (!items.length) return null;
  return (
    <dl aria-label={label} className="grid grid-cols-2 overflow-hidden rounded-xl border bg-border sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] [&>*]:bg-background" style={{ gap: 1 }}>
      {items.map(item => {
        const body = <>
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{item.tone ? <StatusDot tone={item.tone} /> : null}{item.label}</dt>
          <dd className="mt-1.5 truncate text-xl font-semibold tabular-nums tracking-tight">{item.value}</dd>
        </>;
        return item.href
          ? <Link key={item.key ?? item.label} href={item.href} className="block min-w-0 p-4 transition-colors hover:bg-muted/40">{body}</Link>
          : <div key={item.key ?? item.label} className="min-w-0 p-4">{body}</div>;
      })}
    </dl>
  );
}

export function Panel({ title, icon: Icon, actions, children, className, padded = true, id, meta }: {
  title?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
  meta?: ReactNode;
}) {
  return (
    <section aria-labelledby={id && title ? `${id}-title` : undefined} id={id} className={cn("min-w-0 overflow-hidden rounded-xl border bg-background", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
          <div className="min-w-0">
            <h2 id={id ? `${id}-title` : undefined} className="flex min-w-0 items-center gap-2 text-sm font-semibold">{Icon ? <Icon className="size-4 text-muted-foreground" /> : null}{title}</h2>
            {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={padded ? "p-4 md:p-5" : undefined}>{children}</div>
    </section>
  );
}

/** A collapsible panel for forms that are not the page's first job. */
export function DisclosurePanel({ title, meta, children, defaultOpen = false, icon: Icon }: {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <details open={defaultOpen} className="group min-w-0 overflow-hidden rounded-xl border bg-background">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 md:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title}</span>
            {meta ? <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span> : null}
          </span>
        </span>
        <span className={trackClass}><span className={pillClass("raised", "sm")}><span className="group-open:hidden">Open</span><span className="hidden group-open:inline">Close</span></span></span>
      </summary>
      <div className="border-t">{children}</div>
    </details>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 break-words text-sm font-medium">{children}</dd></div>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{tone ? <StatusDot tone={tone} /> : null}{children}</span>;
}

export function EmptyState({ icon: Icon, title, action, compact = false }: { icon?: ComponentType<{ className?: string }>; title: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed bg-background px-6 text-center", compact ? "py-8" : "py-14")}>
      {Icon ? <span className="flex size-11 items-center justify-center rounded-full bg-muted"><Icon className="size-5 text-muted-foreground" /></span> : null}
      <p className={cn("text-sm font-semibold", Icon && "mt-4")}>{title}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** The way forward from a company-less empty state. */
export function SetupCompanyAction() {
  return <Track><PillLink href="/dashboard/platform/setup" variant="primary">Set up company</PillLink></Track>;
}

/** A record that does not exist or is not visible. Rendered in-page: the dashboard's
 * error boundary would otherwise catch notFound() and show a retry screen. */
export function NotFoundPage({ title, backHref, backLabel }: { title: string; backHref: string; backLabel: string }) {
  return (
    <PlatformPage breadcrumbs={[{ type: "link", label: backLabel, href: backHref.replace(/^\/dashboard/, "") }, { type: "page", label: "Not found" }]}>
      <PageHeader title={title} />
      <EmptyState title="This record does not exist or you do not have access" action={<Track><PillLink href={backHref}><ArrowLeft />{backLabel}</PillLink></Track>} />
    </PlatformPage>
  );
}

/** Success / error line under a form. */
export function FormFeedback({ status, message, className }: { status: string; message?: string; className?: string }) {
  if (!message) return null;
  const error = status === "error";
  return (
    <p role={error ? "alert" : "status"} className={cn("flex items-start gap-2 text-sm", error ? "text-destructive" : "text-emerald-700 dark:text-emerald-400", className)}>
      <StatusDot tone={error ? "rose" : "emerald"} className="mt-1.5" />
      <span className="min-w-0">{message}</span>
    </p>
  );
}

export function formatMinor(value: string | null | undefined, currency = "USD", options: { whole?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return "—";
  try {
    const minor = BigInt(value);
    const negative = minor < BigInt(0);
    const absolute = negative ? -minor : minor;
    const whole = (absolute / BigInt(100)).toLocaleString("en-US");
    const cents = (absolute % BigInt(100)).toString().padStart(2, "0");
    const symbol = currency === "USD" ? "$" : `${currency} `;
    return `${negative ? "−" : ""}${symbol}${whole}${options.whole ? "" : `.${cents}`}`;
  } catch {
    return "—";
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isOverdue(value: string | null | undefined) {
  return Boolean(value) && new Date(String(value)).getTime() < Date.now();
}
