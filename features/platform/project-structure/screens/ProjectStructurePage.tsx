import { Hash, MapPin, Plus, Ruler } from "lucide-react";

import { DisclosurePanel, EmptyState, NotFoundPage, PageHeader, Panel, PillLink, PlatformPage, TitleStatus, Track, readable } from "@/features/platform/components/kit";
import { projectToolHref } from "@/features/platform/lib/navigation";
import { BudgetCodeActiveToggle, BudgetCodeForm, LocationForm, RenameLocationForm } from "../components/StructureForms";
import { getProjectStructure, type LocationRow } from "../data";

/** Locations in tree order with their depth; orphans of unreadable parents sit at the top level. */
function flatten(locations: LocationRow[]) {
  const ids = new Set(locations.map(entry => entry.id));
  const children = new Map<string, LocationRow[]>();
  for (const entry of locations) {
    const parent = entry.parent && ids.has(entry.parent.id) ? entry.parent.id : "";
    children.set(parent, [...(children.get(parent) ?? []), entry]);
  }
  const ordered: Array<LocationRow & { depth: number }> = [];
  const walk = (parent: string, depth: number) => {
    for (const entry of children.get(parent) ?? []) {
      if (ordered.some(seen => seen.id === entry.id)) continue;
      ordered.push({ ...entry, depth });
      walk(entry.id, depth + 1);
    }
  };
  walk("", 0);
  return ordered;
}

export async function ProjectStructurePage({ projectId }: { projectId: string }) {
  const structure = await getProjectStructure(projectId);
  if (!structure) return <NotFoundPage title="Project not found" backHref="/dashboard/platform/projects" backLabel="Projects" />;
  const { project, budgetCodes, costCodes } = structure;
  const locations = flatten(structure.locations);
  const overview = projectToolHref(project.id, "");

  return (
    <PlatformPage breadcrumbs={[
      { type: "link", label: "Projects", href: "/platform/projects" },
      { type: "link", label: project.name, href: overview.replace(/^\/dashboard/, "") },
      { type: "page", label: "Cost structure" },
    ]}>
      <PageHeader
        icon={Ruler}
        eyebrow={[project.projectNumber, project.company?.name].filter(Boolean).join(" · ")}
        title="Cost structure"
        status={<TitleStatus status={project.status} />}
        meta={<span className="tabular-nums">{budgetCodes.filter(code => code.isActive).length} active budget codes · {locations.length} locations</span>}
        actions={<Track><PillLink href={overview}>Project</PillLink><PillLink href={projectToolHref(project.id, "financials")}>Financials</PillLink><PillLink href="/dashboard/platform/cost-codes">Company cost codes</PillLink></Track>}
      />

      <Panel id="budget-codes" title="Budget codes" icon={Hash} padded={budgetCodes.length === 0}>
        {budgetCodes.length === 0 ? <EmptyState compact title="No budget codes" /> : (
          <ul className="divide-y">
            {budgetCodes.map(code => (
              <li key={code.id} className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{[code.code, code.costCode ? `${code.costCode.code} ${code.costCode.name}` : null].filter(Boolean).join(" · ")}</p>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 break-words text-sm font-medium">{code.description}</span>
                    <TitleStatus status={code.isActive ? "active" : "inactive"} />
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">{readable(code.costType)} · {code.budgetLineItemsCount ?? 0} budget lines · {code.directCostsCount ?? 0} direct costs</p>
                </div>
                <BudgetCodeActiveToggle id={code.id} isActive={code.isActive} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <DisclosurePanel title="New budget code" icon={Plus} meta={costCodes.length === 0 ? "Add an active company cost code first" : undefined}>
        <BudgetCodeForm projectId={project.id} costCodes={costCodes} />
      </DisclosurePanel>

      <Panel id="locations" title="Locations" icon={MapPin} padded={locations.length === 0}>
        {locations.length === 0 ? <EmptyState compact title="No locations" /> : (
          <ul className="divide-y">
            {locations.map(location => (
              <li key={location.id} className="min-w-0 px-4 py-3 md:px-5">
                <div style={{ paddingInlineStart: `${Math.min(location.depth, 6) * 1.25}rem` }} className="min-w-0">
                  <p className="text-xs text-muted-foreground">{location.code} · {readable(location.locationType)}</p>
                  <p className="mt-0.5 break-words text-sm font-medium">{location.name}</p>
                  <details className="group mt-2 rounded-[6px] border">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Rename</span><span className="hidden group-open:inline">Close</span></summary>
                    <div className="border-t"><RenameLocationForm id={location.id} name={location.name} /></div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <DisclosurePanel title="New location" icon={Plus}>
        <LocationForm projectId={project.id} parents={locations.map(location => ({ id: location.id, label: `${"— ".repeat(location.depth)}${location.code} · ${location.name}` }))} />
      </DisclosurePanel>
    </PlatformPage>
  );
}
