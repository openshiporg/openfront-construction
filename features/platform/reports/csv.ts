import type { WorkItem } from "../projects/data";

export function spreadsheetSafeCell(value: string): string {
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | null): string {
  const safe = spreadsheetSafeCell(value ?? "");
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function formatMinor(value: string | null, currencyCode: string) {
  if (!value) return "";
  try {
    const minor = BigInt(value); const absolute = minor < 0 ? -minor : minor;
    return `${minor < 0 ? "-" : ""}${(absolute / BigInt(100)).toString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")} ${currencyCode}`;
  } catch { return ""; }
}

export function buildProjectReportCsv({
  projectName,
  generatedAt,
  tool,
  currencyCode = "USD",
  items,
  groups = [],
}: {
  projectName: string;
  generatedAt: string;
  tool: string;
  currencyCode?: string;
  items: WorkItem[];
  groups?: Array<{ kind: string; totalCount: number }>;
}): string {
  const exported = (kind: string) => items.filter(item => item.kind === kind).length;
  const rows = [
    ["Project", projectName],
    ["Generated at", generatedAt],
    ["Report", tool],
    ...groups.map(group => [`${group.kind} rows`, exported(group.kind) < group.totalCount ? `${exported(group.kind)} of ${group.totalCount} (most recently updated)` : String(group.totalCount)]),
    [],
    ["Type", "Reference", "Title", "Status", "Due", "Owner", `Amount (${currencyCode})`],
    ...items.map(item => [
      item.kind,
      item.reference,
      item.title,
      item.status,
      item.dueAt ?? "",
      item.owner,
      formatMinor(item.amountMinor, currencyCode),
    ]),
  ];
  return rows.map(row => row.map(value => csvCell(value)).join(",")).join("\r\n");
}
