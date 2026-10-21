"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Building2, CircleCheck } from "lucide-react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ONBOARDING_SETUP_SUMMARY, SAMPLE_WORKSPACE_SUMMARY } from "@/features/keystone/domain/onboarding-manifest";
import type { CommandState } from "@/features/platform/projects/action-state";
import { cn } from "@/lib/utils";
import { DemoFixtureForm } from "./DemoFixtureForm";
import { OnboardingForm } from "./OnboardingForm";

type Mode = "custom" | "sample";

/** The family onboarding shell (setup header, setup type and completion
 * summary beside the step content) around Construction's own workspace setup. */
export function OnboardingSetup({ sampleAvailable, className }: { sampleAvailable: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("custom");
  const [completed, setCompleted] = useState<{ mode: Mode; projectId?: string } | null>(null);
  const onCustomComplete = useCallback((state: CommandState) => setCompleted({ mode: "custom", projectId: state.itemId }), []);
  const onSampleComplete = useCallback((state: CommandState) => setCompleted({ mode: "sample", projectId: state.itemId }), []);
  const summary = completed?.mode === "sample" ? [...ONBOARDING_SETUP_SUMMARY, ...SAMPLE_WORKSPACE_SUMMARY] : ONBOARDING_SETUP_SUMMARY;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row", className)}>
      <div className="flex shrink-0 flex-col lg:w-80 lg:border-r">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex shrink-0 items-center justify-center rounded-sm bg-muted p-3">
              <Building2 className="size-5 text-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-foreground">Workspace setup</h3>
              <p className="text-sm text-muted-foreground">{completed ? "Your workspace is ready" : "Set up your company and first project"}</p>
            </div>
          </div>
          <Separator className="my-4" />
          {completed ? (
            <div className="grid gap-3" role="status">
              <h4 className="text-sm font-medium text-foreground">Setup complete</h4>
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-500">
                <CircleCheck className="size-4 fill-emerald-500 text-background" aria-hidden="true" />
                <span>Onboarding complete</span>
              </div>
              <ul className="grid gap-2 text-sm">
                {summary.map(item => <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 fill-muted-foreground text-background" aria-hidden="true" />
                  <span className="font-medium">{item}</span>
                </li>)}
              </ul>
              {completed.projectId && <Link href={`/dashboard/platform/projects/${encodeURIComponent(completed.projectId)}`} className="inline-flex min-h-11 items-center text-sm font-medium underline">Open project</Link>}
              <Link href="/dashboard/platform/setup" className="inline-flex min-h-11 items-center text-sm font-medium underline">Review setup</Link>
            </div>
          ) : (
            <>
              <h4 className="mb-3 text-sm font-medium text-foreground" id="setup-type-label">Setup type</h4>
              <RadioGroup value={mode} onValueChange={value => setMode(value as Mode)} aria-labelledby="setup-type-label" className="gap-3">
                <Label htmlFor="setup-custom" className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3", mode === "custom" && "border-foreground/40 bg-muted/50")}>
                  <RadioGroupItem id="setup-custom" value="custom" className="mt-0.5" />
                  <span className="grid gap-0.5"><span className="font-medium">Your company</span><span className="text-xs font-normal text-muted-foreground">Your own company, project and budget</span></span>
                </Label>
                <Label htmlFor="setup-sample" className={cn("flex min-h-11 items-start gap-3 rounded-lg border p-3", sampleAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60", mode === "sample" && "border-foreground/40 bg-muted/50")}>
                  <RadioGroupItem id="setup-sample" value="sample" disabled={!sampleAvailable} className="mt-0.5" aria-describedby="setup-sample-state" />
                  <span className="grid gap-0.5"><span className="font-medium">Sample workspace</span><span id="setup-sample-state" className="text-xs font-normal text-muted-foreground">{sampleAvailable ? "Fictional company with draft work" : "Available during first-company setup"}</span></span>
                </Label>
              </RadioGroup>
            </>
          )}
        </div>
      </div>
      {!completed && <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {mode === "sample" && sampleAvailable ? <DemoFixtureForm onComplete={onSampleComplete} /> : <OnboardingForm onComplete={onCustomComplete} />}
      </div>}
    </div>
  );
}
