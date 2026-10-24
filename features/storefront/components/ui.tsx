import type { ReactNode } from "react";
import Link from "next/link";

/*
 * Storefront building blocks. Buttons are raised pills in a recessed track;
 * a status is a dot plus its label, placed on the title line.
 */

export type DotTone = "ok" | "warn" | "busy" | "stop" | "idle";

export function Status({ tone, children }: { tone: DotTone; children: ReactNode }) {
  return <span className="sf-status"><span aria-hidden="true" className={`sf-dot sf-dot--${tone}`} />{children}</span>;
}

export function Track({ children, label, wrap = false, scroll = false, className = "" }: { children: ReactNode; label?: string; wrap?: boolean; scroll?: boolean; className?: string }) {
  return <div role={label ? "group" : undefined} aria-label={label} className={`sf-track${wrap ? " sf-track--wrap" : ""}${scroll ? " sf-track--scroll" : ""} ${className}`.trim()}>{children}</div>;
}

export function Pill({ href, children, variant = "raised", size, current, ariaLabel }: {
  href: string;
  children: ReactNode;
  variant?: "raised" | "primary" | "quiet";
  size?: "sm";
  current?: boolean;
  ariaLabel?: string;
}) {
  const className = `sf-pill${variant === "quiet" ? "" : ` sf-pill--${variant}`}${size ? " sf-pill--sm" : ""}`;
  return <Link href={href} className={className} aria-current={current ? "page" : undefined} aria-label={ariaLabel}>{children}</Link>;
}

export function pillClass(variant: "raised" | "primary" | "quiet" | "danger" = "raised", size?: "sm") {
  return `sf-pill${variant === "quiet" ? "" : ` sf-pill--${variant}`}${size ? " sf-pill--sm" : ""}`;
}

export function SectionHead({ index, title, id, action }: { index?: string; title: string; id: string; action?: ReactNode }) {
  return (
    <div className="sf-sechead">
      <div>
        {index ? <span className="sf-sechead__index">{index}</span> : null}
        <h2 id={id} className="sf-display sf-h2">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, action, heading = false }: { title: string; action?: ReactNode; heading?: boolean }) {
  const Title = heading ? "h1" : "p";
  return <div className="sf-empty"><Title className="sf-empty__title">{title}</Title>{action}</div>;
}

/** Two-to-three letter monogram for project plates. */
export function monogram(value: string) {
  const words = value.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(word => word.length > 1 && !/^(the|of|and|at|for)$/i.test(word));
  return (words.length ? words : [value]).slice(0, 3).map(word => word[0]).join("").toUpperCase() || "—";
}

/** Public completion labels are free text; read them for a dot tone. */
export function completionTone(label: string): DotTone {
  if (/complete|finished|delivered|occupied|handed/i.test(label)) return "ok";
  if (/progress|construction|underway|ongoing|active/i.test(label)) return "busy";
  if (/pre|design|planning|upcoming/i.test(label)) return "warn";
  return "idle";
}

const OK = new Set(["active", "approved", "approved_as_noted", "executed", "complete", "completed", "passed", "received", "accepted", "answered", "settled", "paid", "issued", "awarded", "resolved", "acknowledged"]);
const WARN = new Set(["pending", "submitted", "under_review", "requested", "quoted", "out_for_signature", "intent_to_bid", "investigating", "ordered", "partially_received", "partially_paid", "ready_for_verification", "invited", "viewed", "revise_resubmit", "on_hold"]);
const BUSY = new Set(["open", "scheduled", "assigned", "in_progress", "planning"]);
const STOP = new Set(["rejected", "failed", "cancelled", "voided", "declined", "terminated", "expired", "reversed"]);

/** Record statuses shared with portal participants, read as a dot tone. */
export function statusDot(status: string): DotTone {
  const key = status.toLowerCase();
  if (OK.has(key)) return "ok";
  if (WARN.has(key)) return "warn";
  if (BUSY.has(key)) return "busy";
  if (STOP.has(key)) return "stop";
  return "idle";
}

export function readableStatus(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
