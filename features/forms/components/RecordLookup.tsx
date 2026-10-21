"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { searchProjectOptionsAction } from "@/features/platform/projects/option-actions";
import { focusRelationshipOption } from "../lib/option-keyboard";
import { wrappingLabelText } from "./FormSelect";

export type LookupOption = ConstructionOption;

/** constructionProjectOptions loads 100 records per kind; the search query
 * pages 25 at a time, so browsing beyond the initial set starts at page 5. */
const INITIAL_PER_KIND = 100;
const SEARCH_PAGE_SIZE = 25;

type Props = {
  name: string;
  projectId: string;
  /** Option kinds this field accepts (e.g. ["primeContract", "commitment"]). */
  kinds: readonly string[];
  /** First page already loaded with the workspace. */
  initial: readonly LookupOption[];
  /** Narrows choices to records eligible for this operation/parent. */
  eligible?: (option: LookupOption) => boolean;
  required?: boolean;
  emptyLabel?: string;
  value?: string;
  onValueChange?(value: string, option: LookupOption | undefined): void;
  className?: string;
  "aria-label"?: string;
};

export function optionText(option: LookupOption): string {
  return option.detail ? `${option.label} — ${option.detail}` : option.label;
}

/** Merges option lists by kind + id, keeping first occurrences. */
export function mergeOptions(...lists: ReadonlyArray<readonly LookupOption[]>): LookupOption[] {
  const seen = new Set<string>();
  const merged: LookupOption[] = [];
  for (const list of lists) for (const option of list) {
    const key = `${option.kind}:${option.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
  }
  return merged;
}

/** Searchable, paginated record selector for project workflows. Records come
 * from the authorized option lookup, so older records stay selectable beyond
 * the first page, and a selected value outside the loaded page is resolved by
 * id. Native form transport mirrors FormSelect. */
export function RecordLookup({ name, projectId, kinds, initial, eligible, required, emptyLabel = "Select…", value, onValueChange, className, "aria-label": ariaLabel }: Props) {
  const [selected, setSelected] = useState("");
  const current = value ?? selected;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [remote, setRemote] = useState<{ query: string; items: LookupOption[]; hasMore: boolean } | null>(null);
  const [resolved, setResolved] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [fieldLabel, setFieldLabel] = useState("");
  const listId = useId();
  const errorId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const kindKey = kinds.join(",");
  const label = ariaLabel || fieldLabel || undefined;

  useEffect(() => {
    if (!ariaLabel && container.current) setFieldLabel(wrappingLabelText(container.current));
  }, [ariaLabel]);

  const known = useMemo(() => mergeOptions(initial, remote?.items ?? [], resolved), [initial, remote, resolved]);
  const chosen = current ? known.find(option => option.id === current && kinds.includes(option.kind)) : undefined;

  // Resolve a selected id that is not in the loaded page (e.g. restored state).
  useEffect(() => {
    if (!current || chosen) return;
    let cancelled = false;
    void searchProjectOptionsAction(projectId, { kinds: kindKey.split(","), ids: [current] }).then(result => {
      if (!cancelled && !("error" in result)) setResolved(previous => mergeOptions(previous, result.items));
    });
    return () => { cancelled = true; };
  }, [current, chosen, projectId, kindKey]);

  // Server search, debounced; an empty query pages through all records.
  useEffect(() => {
    if (!open) return;
    const query = search.trim();
    if (!query && page === 1) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const serverPage = query ? page : INITIAL_PER_KIND / SEARCH_PAGE_SIZE + page - 1;
      void searchProjectOptionsAction(projectId, { kinds: kindKey.split(","), search: query, page: serverPage }).then(result => {
        if (cancelled) return;
        setLoading(false);
        if ("error" in result) { setError(result.error); return; }
        setError("");
        setRemote(previous => ({
          query,
          items: page > 1 && previous?.query === query ? mergeOptions(previous.items, result.items) : result.items,
          hasMore: result.hasMore,
        }));
      });
    }, query ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, search, page, projectId, kindKey]);

  const query = search.trim();
  const pool = query ? (remote?.query === query ? remote.items : []) : mergeOptions(initial, remote?.query === "" ? remote.items : []);
  const choices = pool.filter(option => kinds.includes(option.kind) && (!eligible || eligible(option)));
  const initialFull = kinds.some(kind => initial.filter(option => option.kind === kind).length >= INITIAL_PER_KIND);
  const canLoadMore = query ? Boolean(remote?.query === query && remote.hasMore) : (remote?.query === "" ? remote.hasMore : initialFull);

  function commit(option: LookupOption | undefined) {
    const next = option?.id ?? "";
    setSelected(next);
    setInvalid(false);
    onValueChange?.(next, option);
  }
  function toggle(next: boolean) {
    setOpen(next);
    if (!next) { setSearch(""); setPage(1); }
  }

  return <div ref={container} className="min-w-0">
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button ref={trigger} type="button" role="combobox" aria-label={label} aria-controls={listId} aria-haspopup="listbox" aria-expanded={open}
          aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} aria-errormessage={invalid ? errorId : undefined}
          onKeyDown={event => { if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); toggle(true); } }}
          className={cn("flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aria-invalid:border-destructive", className)}>
          <span className="min-w-0 flex-1 truncate">{chosen ? optionText(chosen) : current ? "Selected record" : emptyLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {open && <PopoverContent onKeyDown={focusRelationshipOption} className="animate-none! max-h-(--radix-popover-content-available-height) w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[440px] overflow-y-auto p-0" align="start">
        <div className="border-b px-3">
          <input aria-label="Search records" placeholder="Search…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}
            className="min-h-11 w-full min-w-11 bg-transparent text-base outline-none" />
        </div>
        <div id={listId} role="listbox" aria-label={label ?? emptyLabel} aria-busy={loading || undefined} className="max-h-72 overflow-y-auto p-1">
          {!required && <button type="button" role="option" aria-selected={!current} onClick={() => { commit(undefined); toggle(false); }}
            className="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">{emptyLabel}</button>}
          {choices.map(option => <button key={`${option.kind}:${option.id}`} type="button" role="option" aria-selected={current === option.id}
            onClick={() => { commit(option); toggle(false); }}
            className={cn("flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none", current === option.id && "bg-accent")}>
            <span className="min-w-0 flex-1 break-words">{optionText(option)}</span>
            {current === option.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
          </button>)}
          {loading && <p role="status" className="p-3 text-sm">Loading…</p>}
          {!loading && error && <p role="alert" className="p-3 text-sm text-destructive">{error}</p>}
          {!loading && !error && choices.length === 0 && <p role="status" className="p-3 text-sm">No matching records</p>}
          {!loading && canLoadMore && <button type="button" onClick={() => setPage(previous => previous + 1)}
            className="flex min-h-11 w-full items-center justify-center rounded-md px-3 py-2 text-sm underline hover:bg-accent">Show more</button>}
        </div>
      </PopoverContent>}
    </Popover>
    <select aria-hidden="true" tabIndex={-1} style={{ display: "none" }} name={name} value={current} required={required}
      onChange={event => setSelected(event.target.value)}
      onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); }}>
      <option value="">{emptyLabel}</option>
      {current && <option value={current}>{chosen ? optionText(chosen) : current}</option>}
    </select>
    {invalid && <span id={errorId} role="alert" className="block text-sm text-destructive">Select a record.</span>}
  </div>;
}
