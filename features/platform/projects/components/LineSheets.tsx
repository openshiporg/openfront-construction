import Link from "next/link";
import type { LineSheet } from "@/features/platform/projects/data";
import { EmptyState, Panel, TitleStatus, formatMinor } from "@/features/platform/components/kit";

/** Estimates and contracts shown the way they are read on paper: one document, its lines, its total.
 *  A table from tablet up; on a phone each line is a row with its amount under the description. */
export function LineSheets({ id, title, empty, projectId, sheets }: { id: string; title: string; empty: string; projectId: string; sheets: LineSheet[] }) {
  return (
    <Panel id={id} title={title} meta={sheets.length ? `${sheets.length} on this project` : undefined} padded={false}>
      {sheets.length === 0 ? <div className="p-4 md:p-5"><EmptyState compact title={empty} /></div> : (
        <div className="divide-y">
          {sheets.map(sheet => (
            <section key={`${sheet.detailKind}:${sheet.id}`} aria-label={`${sheet.kind} ${sheet.number}`} className="grid gap-3 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{[sheet.kind, sheet.number, sheet.party].filter(Boolean).join(" · ")}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">
                      <Link href={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/${sheet.detailKind}/${encodeURIComponent(sheet.id)}`} className="underline-offset-4 hover:underline">{sheet.title || sheet.number}</Link>
                    </h3>
                    <TitleStatus status={sheet.status} />
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-muted-foreground">{sheet.totalLabel}</p>
                  <p className="text-base font-semibold tabular-nums">{formatMinor(sheet.totalMinor, sheet.currencyCode)}</p>
                </div>
              </div>
              {sheet.lines.length > 0 && (
                <ol className="grid divide-y rounded-[6px] border">
                  {sheet.lines.map(line => (
                    <li key={line.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-3 py-2.5 text-sm sm:grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:items-baseline">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{String(line.lineNumber).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <p className="[overflow-wrap:anywhere]">{line.description}</p>
                        {line.code || line.quantity ? <p className="text-xs text-muted-foreground">{[line.code, line.quantity].filter(Boolean).join(" · ")}</p> : null}
                      </div>
                      <span className="col-start-2 font-medium tabular-nums sm:col-start-3 sm:text-right">{formatMinor(line.amountMinor, sheet.currencyCode)}</span>
                    </li>
                  ))}
                </ol>
              )}
              {sheet.moreLines > 0 ? <p className="text-xs text-muted-foreground">and {sheet.moreLines} more lines</p> : null}
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
