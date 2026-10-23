import { Pager } from "@/features/platform/components/kit";

export function ListPager({ label, page, totalPages, hrefFor }: {
  label: string;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  return <Pager label={label} page={page} totalPages={totalPages} prevHref={hrefFor(page - 1)} nextHref={hrefFor(page + 1)} />;
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
