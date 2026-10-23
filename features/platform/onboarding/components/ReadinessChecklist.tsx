import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import type { ConstructionOnboardingReadiness } from "@/features/keystone/queries/onboarding-readiness";

type Check = ConstructionOnboardingReadiness["companies"][number]["checks"][number];

function CheckRow({ check, index }: { check: Check; index: number }) {
  return (
    <li>
      <Link href={check.href} className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 md:px-5">
        <span className={`flex size-7 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ${check.complete ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950" : "border text-muted-foreground"}`}>
          {check.complete ? <Check className="size-3.5" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium"><span className="sr-only">{check.complete ? "Completed: " : "To do: "}</span>{check.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{check.detail}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">{check.complete ? "Review" : "Set up"}<ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
      </Link>
    </li>
  );
}

function Progress({ checks }: { checks: Check[] }) {
  const done = checks.filter(check => check.complete).length;
  return <span className="text-xs tabular-nums text-muted-foreground">{done} / {checks.length}</span>;
}

export function ReadinessChecklist({ companies }: { companies: ConstructionOnboardingReadiness["companies"] }) {
  return (
    <div className="grid gap-6">
      {companies.map(company => (
        <section key={company.companyId} aria-labelledby={`readiness-${company.companyId}`} className="overflow-hidden rounded-xl border bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
            <h2 id={`readiness-${company.companyId}`} className="text-sm font-semibold">{company.name}</h2>
            <Progress checks={company.checks} />
          </div>
          <ol className="divide-y">{company.checks.map((check, index) => <CheckRow key={check.key} check={check} index={index} />)}</ol>
          {company.projects.map(project => (
            <section key={project.projectId} aria-labelledby={`readiness-${project.projectId}`} className="border-t">
              <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-2.5 md:px-5">
                <h3 id={`readiness-${project.projectId}`} className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{project.name}</h3>
                <Progress checks={project.checks} />
              </div>
              <ol className="divide-y border-t">{project.checks.map((check, index) => <CheckRow key={check.key} check={check} index={index} />)}</ol>
            </section>
          ))}
          {company.projects.length === 0 && <p className="border-t px-4 py-3 text-sm text-muted-foreground md:px-5">No open projects</p>}
        </section>
      ))}
    </div>
  );
}
