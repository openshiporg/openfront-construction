import type { PayApplication, ScheduleTimeline as Timeline } from "@/features/platform/projects/data";
import { EmptyState, Panel, TitleStatus, formatDate, formatMinor } from "@/features/platform/components/kit";

const DAY = 86_400_000;

/** The schedule as bars on one time axis (a Gantt view): where each task sits between the first start
 *  and the last finish, how far along it is, and where today falls. Milestones are diamonds.
 *  On a phone the bar sits under the task name, so nothing scrolls sideways. */
export function ScheduleTimeline({ timeline, now }: { timeline: Timeline; now: string }) {
  const dated = timeline.tasks.filter(task => task.start);
  if (!dated.length) return <Panel id="schedule-timeline" title="Timeline"><EmptyState compact title="No dated tasks yet. Add a task under Record below." /></Panel>;
  const starts = dated.map(task => Date.parse(task.start as string));
  const ends = dated.map(task => Date.parse(task.finish ?? (task.start as string)));
  const from = Math.min(...starts); const to = Math.max(...ends, from + DAY);
  const span = to - from;
  const at = (value: number) => Math.max(0, Math.min(100, ((value - from) / span) * 100));
  const today = Date.parse(now); const todayAt = today >= from && today <= to ? at(today) : null;
  return (
    <Panel id="schedule-timeline" title="Timeline" meta={`${timeline.scheduleName ? `${timeline.scheduleName} · ` : ""}${formatDate(new Date(from).toISOString())} to ${formatDate(new Date(to).toISOString())}`} padded={false}>
      <ol className="divide-y">
        {dated.map(task => {
          const start = Date.parse(task.start as string); const finish = Date.parse(task.finish ?? (task.start as string));
          const left = at(start); const width = Math.max(at(finish) - left, 0);
          const late = task.percentComplete < 100 && finish < today && !["complete", "completed", "cancelled"].includes(task.status);
          return (
            <li key={task.id} className="grid gap-x-5 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:items-center md:px-5">
              <div className="min-w-0">
                <p className="text-sm font-medium [overflow-wrap:anywhere]">{task.name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {[task.code, task.isMilestone ? formatDate(task.start) : `${formatDate(task.start)} to ${formatDate(task.finish)}`, task.who].filter(Boolean).join(" · ")}
                  {late ? <span className="text-red-600 dark:text-red-400"> · Late</span> : null}
                </p>
              </div>
              <div className="relative h-5" role="img" aria-label={task.isMilestone ? `Milestone on ${formatDate(task.start)}` : `${task.percentComplete}% complete, ${formatDate(task.start)} to ${formatDate(task.finish)}`}>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                {todayAt !== null ? <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${todayAt}%` }} /> : null}
                {task.isMilestone
                  ? <div className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground" style={{ left: `${left}%` }} />
                  : <div className={`absolute top-1/2 h-2.5 min-w-1.5 -translate-y-1/2 overflow-hidden rounded-[2px] ${late ? "bg-red-500/30" : "bg-foreground/20"}`} style={{ left: `${left}%`, width: `${width}%` }}>
                      <div className={`h-full ${late ? "bg-red-500" : "bg-foreground"}`} style={{ width: `${task.percentComplete}%` }} />
                    </div>}
              </div>
            </li>
          );
        })}
      </ol>
      {todayAt !== null || timeline.moreTasks > 0 ? <p className="border-t px-4 py-2.5 text-xs text-muted-foreground md:px-5">{[todayAt !== null ? "The vertical line is today." : "", timeline.moreTasks > 0 ? `${timeline.moreTasks} more tasks are in the queue below.` : ""].filter(Boolean).join(" ")}</p> : null}
    </Panel>
  );
}

/** Pay applications with the figures a G702 summary carries: completed to date, retainage held, due now, received. */
export function PayApplications({ claims }: { claims: PayApplication[] }) {
  const cell = (label: string, value: string, strong = false) => <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`tabular-nums ${strong ? "text-base font-semibold" : "text-sm"}`}>{value}</dd></div>;
  return (
    <Panel id="pay-applications" title="Pay applications" meta={claims.length ? `${claims.length} on this project` : undefined} padded={false}>
      {claims.length === 0 ? <div className="p-4 md:p-5"><EmptyState compact title="No pay applications yet. Start one under Record below." /></div> : (
        <ul className="divide-y">
          {claims.map(claim => {
            let open = BigInt(0); try { open = BigInt(claim.dueMinor) - BigInt(claim.paidMinor); } catch { open = BigInt(0); }
            return (
              <li key={claim.id} className="grid gap-3 px-4 py-4 md:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold">{claim.number}</h3>
                  <TitleStatus status={claim.status} />
                  <p className="basis-full text-xs text-muted-foreground">{[claim.party ? `${claim.outgoing ? "Payable to" : "Billed to"} ${claim.party}` : "", claim.contract, claim.periodEnd ? `Period to ${formatDate(claim.periodEnd)}` : "", claim.dueAt ? `Due ${formatDate(claim.dueAt)}` : ""].filter(Boolean).join(" · ")}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
                  {cell("Completed to date", formatMinor(claim.completedMinor, claim.currencyCode))}
                  {cell("Retainage held", formatMinor(claim.retainageMinor, claim.currencyCode))}
                  {cell("Previously paid", formatMinor(claim.previousMinor, claim.currencyCode))}
                  {cell("Due this period", formatMinor(claim.dueMinor, claim.currencyCode), true)}
                  {cell(open > BigInt(0) ? "Still owed" : "Received", formatMinor(open > BigInt(0) ? open.toString() : claim.paidMinor, claim.currencyCode))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
