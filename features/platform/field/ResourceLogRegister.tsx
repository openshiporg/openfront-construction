import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import type { ResourceLogRegisterPage } from "../projects/data";

type Params = Record<string, string | string[] | undefined>;
export function resourceLogsHref(projectId: string, params: Params, page: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, raw]) => { if (raw !== undefined) (Array.isArray(raw) ? raw : [raw]).forEach(value => query.append(key, value)); });
  query.delete("resourcePage");
  if (page > 1) query.set("resourcePage", String(page));
  return `/dashboard/platform/projects/${encodeURIComponent(projectId)}/field${query.size ? `?${query}` : ""}`;
}
export function ResourceLogRegister({ projectId, register, searchParams }: { projectId: string; register: ResourceLogRegisterPage; searchParams: Params }) {
  return <section className="border-b px-4 py-6 md:px-6" aria-labelledby="resource-register-title">
    <h2 id="resource-register-title" className="font-semibold">Equipment and material activity</h2>
    <p className="text-sm text-muted-foreground">{register.totalCount} entries · page {register.page} of {register.totalPages}, newest first</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" action={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/field`}>
      {Object.entries(searchParams).filter(([key]) => !["resourcePage", "resourceSearch", "resourceType", "resourceEvent"].includes(key)).flatMap(([key, raw]) => raw === undefined ? [] : (Array.isArray(raw) ? raw : [raw]).map((value, index) => <input type="hidden" key={`${key}:${index}`} name={key} value={value} />))}
      <label className="grid gap-1 text-sm">Search notes<input name="resourceSearch" defaultValue={register.search} maxLength={200} className="h-10 rounded-md border bg-background px-3" /></label>
      <label className="grid gap-1 text-sm">Type<FormSelect name="resourceType" defaultValue={register.type} className="h-10 rounded-md border bg-background px-3">{["all", "equipment", "material"].map(value => <option key={value} value={value}>{value}</option>)}</FormSelect></label>
      <label className="grid gap-1 text-sm">Event<FormSelect name="resourceEvent" defaultValue={register.event} className="h-10 rounded-md border bg-background px-3">{["all", "equipment_use", "equipment_idle", "equipment_breakdown", "material_received", "material_installed", "material_transferred", "material_wasted"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</FormSelect></label>
      <button className="h-10 rounded-md border px-3 text-sm" type="submit">Apply filters</button>
    </form>
    <div className="mt-4 divide-y border-y">{register.items.length ? register.items.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div><Link href={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/resource-log/${encodeURIComponent(row.id)}`} className="font-medium hover:underline">{row.eventType.replaceAll("_", " ")}</Link><p className="text-xs text-muted-foreground">{row.resourceLabel || row.resourceType}</p></div><p className="text-sm">{row.quantity} {row.unit}</p><p className="text-xs text-muted-foreground">{row.occurredAt ? new Date(row.occurredAt).toLocaleString() : "Time unavailable"}</p>
    </article>) : <p className="py-8 text-center text-sm text-muted-foreground">No activity matches these filters.</p>}</div>
    <nav aria-label="Resource pages" className="mt-4 flex justify-between text-sm">{register.page > 1 ? <Link href={resourceLogsHref(projectId, searchParams, register.page - 1)}>Previous</Link> : <span />}{register.page < register.totalPages && <Link href={resourceLogsHref(projectId, searchParams, register.page + 1)}>Next</Link>}</nav>
  </section>;
}
