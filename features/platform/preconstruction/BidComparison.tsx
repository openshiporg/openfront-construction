import type { BidComparisonRow } from "@/features/platform/projects/data";
import { Panel, TitleStatus, formatDate, formatMinor } from "@/features/platform/components/kit";

/** Submitted bids per package, cheapest first, with the spread against the low bid. */
export function BidComparison({ rows }: { rows: BidComparisonRow[] }) {
  if (!rows.length) return null;
  const packages = new Map<string, BidComparisonRow[]>();
  for (const row of rows) packages.set(row.packageNumber, [...(packages.get(row.packageNumber) ?? []), row]);
  return (
    <Panel id="bid-comparison" title="Bid leveling" meta={`${rows.length} bids · ${packages.size} packages`} padded={false}>
      <div className="divide-y">
        {[...packages.entries()].map(([packageNumber, bids]) => {
          const low = bids.reduce((min, bid) => { try { return BigInt(bid.totalMinor) < min ? BigInt(bid.totalMinor) : min; } catch { return min; } }, BigInt(bids[0]?.totalMinor || "0"));
          return (
            <section key={packageNumber} aria-label={`Package ${packageNumber}`} className="px-4 py-4 md:px-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Package {packageNumber}</p>
              <h3 className="mt-0.5 text-sm font-semibold">{bids[0]?.packageTitle}</h3>
              <ol className="mt-3 grid gap-2">
                {bids.map((bid, index) => {
                  let spread = "";
                  try { const diff = BigInt(bid.totalMinor) - low; spread = diff > BigInt(0) ? `+${formatMinor(diff.toString(), bid.currencyCode, { whole: true })}` : ""; } catch { spread = ""; }
                  return (
                    <li key={bid.id} className="grid gap-2 rounded-lg border px-3 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-sm font-medium">{bid.partnerName}</span>
                          <TitleStatus status={bid.status} />
                          {index === 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Low bid</span> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{bid.submissionNumber} · {formatDate(bid.submittedAt)} · {bid.lineCount} line{bid.lineCount === 1 ? "" : "s"}</p>
                        {bid.exclusions || bid.clarifications ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{bid.exclusions || bid.clarifications}</p> : null}
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-base font-semibold tabular-nums">{formatMinor(bid.totalMinor, bid.currencyCode)}</p>
                        {spread ? <p className="text-xs tabular-nums text-muted-foreground">{spread}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
