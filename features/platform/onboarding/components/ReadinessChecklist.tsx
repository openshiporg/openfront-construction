import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle } from "lucide-react";

import type { ConstructionOnboardingReadiness } from "@/features/keystone/queries/onboarding-readiness";

type Check = ConstructionOnboardingReadiness["companies"][number]["checks"][number];

function CheckRow({ check }: { check: Check }) {
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className="flex size-8 items-center justify-center rounded-full border">
        {check.complete
          ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          : <Circle className="size-4 text-muted-foreground" aria-hidden="true" />}
      </span>
      <div className="min-w-0">
        <p className="font-medium"><span className="sr-only">{check.complete ? "Completed: " : "Pending: "}</span>{check.label}</p>
        <p className="text-sm text-muted-foreground">{check.complete ? "Done" : "To do"} · {check.detail}</p>
      </div>
      <Link href={check.href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
        {check.complete ? "Review" : "Set up"}<span className="sr-only"> {check.label}</span>
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function ReadinessChecklist({ companies }: { companies: ConstructionOnboardingReadiness["companies"] }) {
  return (
    <div className="grid gap-8">
      {companies.map(company => (
        <section key={company.companyId} aria-labelledby={`readiness-${company.companyId}`} className="grid gap-2">
          <h2 id={`readiness-${company.companyId}`} className="text-lg font-semibold">{company.name}</h2>
          <ol className="divide-y border-y">{company.checks.map(check => <CheckRow key={check.key} check={check} />)}</ol>
          {company.projects.map(project => (
            <section key={project.projectId} aria-labelledby={`readiness-${project.projectId}`} className="mt-4 grid gap-2">
              <h3 id={`readiness-${project.projectId}`} className="font-semibold">{project.name}</h3>
              <ol className="divide-y border-y">{project.checks.map(check => <CheckRow key={check.key} check={check} />)}</ol>
            </section>
          ))}
          {company.projects.length === 0 && <p className="text-sm text-muted-foreground">No open projects</p>}
        </section>
      ))}
    </div>
  );
}
