import { Badge } from "@/components/ui/badge";
import type { BidComparisonRow } from "@/features/platform/projects/data";

function money(value: string, currency: string) {
  try {
    const minor = BigInt(value); const absolute = minor < 0 ? -minor : minor;
    return `${minor < 0 ? "-" : ""}${currency} ${(absolute / BigInt(100)).toLocaleString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch { return `${currency} —`; }
}
function readable(value: string) { return value.replaceAll("_", " "); }

export function BidComparison({ rows }: { rows: BidComparisonRow[] }) {
  if (!rows.length) return null;
  return <section className="border-y px-4 py-6 md:px-6" aria-labelledby="bid-comparison-title"><h2 id="bid-comparison-title" className="font-semibold">Bid comparison</h2><p className="mt-1 text-sm text-muted-foreground">Submitted totals are ordered low-to-high. Award still requires a closed package, matching budget-coded lines, contract permission, and transactional budget handoff.</p><div className="mt-4 overflow-x-auto border-y"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2">Package</th><th className="px-3 py-2">Bidder</th><th className="px-3 py-2">Submission</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Scope evidence</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row.id} className="align-top"><td className="px-3 py-3"><p className="font-medium">{row.packageNumber}</p><p className="text-xs text-muted-foreground">{row.packageTitle}</p></td><td className="px-3 py-3">{row.partnerName}</td><td className="px-3 py-3"><p>{row.submissionNumber}</p><p className="text-xs text-muted-foreground">{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "No date"}</p></td><td className="px-3 py-3 font-medium tabular-nums">{money(row.totalMinor, row.currencyCode)}</td><td className="max-w-sm px-3 py-3"><p>{row.lineCount} scoped line{row.lineCount === 1 ? "" : "s"}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.exclusions || row.clarifications || "No exclusions or clarifications recorded"}</p></td><td className="px-3 py-3"><Badge variant="outline">{readable(row.status)}</Badge></td></tr>)}</tbody></table></div></section>;
}
