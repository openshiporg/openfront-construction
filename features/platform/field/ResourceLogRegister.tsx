import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import { Search } from "lucide-react";

import type { ResourceLogRegisterPage } from "../projects/data";
import { EmptyState, Pager, StatusDot, fieldLabelClass, inputClass, pillClass, readable, selectClass, trackClass, type Tone } from "../components/kit";

type Params = Record<string, string | string[] | undefined>;
export function resourceLogsHref(projectId: string, params: Params, page: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, raw]) => { if (raw !== undefined) (Array.isArray(raw) ? raw : [raw]).forEach(value => query.append(key, value)); });
  query.delete("resourcePage");
  if (page > 1) query.set("resourcePage", String(page));
  return `/dashboard/platform/projects/${encodeURIComponent(projectId)}/field${query.size ? `?${query}` : ""}`;
}

const eventTone: Record<string, Tone> = {
  equipment_use: "blue", equipment_idle: "zinc", equipment_breakdown: "rose",
  material_received: "emerald", material_installed: "blue", material_transferred: "sky", material_wasted: "orange",
};

export function ResourceLogRegister({ projectId, register, searchParams }: { projectId: string; register: ResourceLogRegisterPage; searchParams: Params }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border bg-background" aria-labelledby="resource-register-title">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
      <div>
        <h2 id="resource-register-title" className="text-sm font-semibold">Equipment & material activity</h2>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{register.totalCount} entries</p>
      </div>
      <Pager label="Resource pages" page={register.page} totalPages={register.totalPages} prevHref={resourceLogsHref(projectId, searchParams, register.page - 1)} nextHref={resourceLogsHref(projectId, searchParams, register.page + 1)} />
    </div>
    <form className="grid gap-3 border-b px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_12rem_auto] sm:items-end md:px-5" action={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/field`}>
      {Object.entries(searchParams).filter(([key]) => !["resourcePage", "resourceSearch", "resourceType", "resourceEvent"].includes(key)).flatMap(([key, raw]) => raw === undefined ? [] : (Array.isArray(raw) ? raw : [raw]).map((value, index) => <input type="hidden" key={`${key}:${index}`} name={key} value={value} />))}
      <label className={fieldLabelClass}>Search notes<input name="resourceSearch" defaultValue={register.search} maxLength={200} className={inputClass} /></label>
      <label className={fieldLabelClass}>Type<FormSelect name="resourceType" defaultValue={register.type} className={selectClass}>{["all", "equipment", "material"].map(value => <option key={value} value={value}>{readable(value)}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Event<FormSelect name="resourceEvent" defaultValue={register.event} className={selectClass}>{["all", "equipment_use", "equipment_idle", "equipment_breakdown", "material_received", "material_installed", "material_transferred", "material_wasted"].map(value => <option key={value} value={value}>{readable(value)}</option>)}</FormSelect></label>
      <span className={trackClass}><button className={pillClass("raised")} type="submit"><Search />Apply</button></span>
    </form>
    <div className="p-4 md:px-5">
      {register.items.length ? <ul className="divide-y overflow-hidden rounded-lg border">{register.items.map(row => <li key={row.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center md:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot tone={eventTone[row.eventType] ?? "zinc"} />
            <Link href={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/resource-log/${encodeURIComponent(row.id)}`} className="text-sm font-medium underline-offset-4 hover:underline">{readable(row.eventType)}</Link>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.resourceLabel || readable(row.resourceType)}</p>
        </div>
        <p className="text-sm font-medium tabular-nums">{row.quantity} {row.unit}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{row.occurredAt ? new Date(row.occurredAt).toLocaleString() : "Time unavailable"}</p>
      </li>)}</ul> : <EmptyState compact title="No activity matches these filters" />}
    </div>
  </section>;
}
