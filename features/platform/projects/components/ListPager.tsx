import Link from "next/link";

export function ListPager({ label, page, totalPages, hrefFor }: {
  label: string;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center gap-2 text-sm">
      {page > 1
        ? <Link rel="prev" href={hrefFor(page - 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Previous</Link>
        : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Previous</span>}
      <span className="text-xs tabular-nums text-muted-foreground">Page {page} of {totalPages}</span>
      {page < totalPages
        ? <Link rel="next" href={hrefFor(page + 1)} className="rounded-md border px-3 py-1.5 hover:bg-muted">Next</Link>
        : <span aria-disabled="true" className="rounded-md border px-3 py-1.5 text-muted-foreground">Next</span>}
    </nav>
  );
}

export function listHref(base: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || (key.toLowerCase().endsWith("page") && Number(value) <= 1)) continue;
    query.set(key, String(value));
  }
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export function pageParam(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function textParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] ?? "" : value ?? "").trim().slice(0, 120);
}
