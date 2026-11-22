"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type ToolGroup = { title: string; items: Array<{ title: string; href: string; current: boolean }> };

/** Phone project navigation: one button naming the open tool, and a list of every tool
 * under it. A row of fifteen tabs hides most of the project behind a sideways scroll. */
export function ProjectToolMenu({ groups }: { groups: ToolGroup[] }) {
  const current = groups.flatMap(group => group.items).find(item => item.current);
  // Open is remembered against the tool it was opened on, so choosing another tool closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === (current?.href ?? "");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenOn(null); };
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onPointer); };
  }, [open]);

  return (
    <div ref={root} className="relative sm:hidden">
      <button type="button" aria-expanded={open} aria-controls="project-tool-list" onClick={() => setOpenOn(open ? null : current?.href ?? "")} className="flex h-11 w-full items-center justify-between gap-3 rounded-[5px] border border-border bg-background px-3 text-left text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="min-w-0 truncate"><span className="font-normal text-muted-foreground">Section · </span>{current?.title ?? "Overview"}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <nav id="project-tool-list" aria-label="Project tools" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-[6px] border border-border bg-popover py-1 shadow-lg">
          {groups.map(group => (
            <div key={group.title} role="group" aria-label={group.title} className="border-b border-border py-1 last:border-b-0">
              <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">{group.title}</p>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} onClick={() => setOpenOn(null)} className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm aria-[current=page]:font-medium">
                  {item.title}
                  {item.current ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
