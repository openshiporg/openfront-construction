"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { touchDialogClose } from "@/features/forms/lib/touch";
import type { ConstructionOnboardingReadiness } from "@/features/keystone/queries/onboarding-readiness";
import { loadOnboardingReadiness } from "../actions/onboarding";
import { OnboardingSetup } from "./OnboardingSetup";
import { ReadinessChecklist } from "./ReadinessChecklist";

type LoadState = { status: "loading" } | { status: "ready"; readiness: ConstructionOnboardingReadiness } | { status: "error" };

/** Family layout-level onboarding dialog. Construction setup runs its own
 * workspace transaction rather than the commerce store seed. */
export default function OnboardingDialog({ isOpen, onClose }: {
  isOpen: boolean; onClose(): void;
}) {
  if (!isOpen) return null;
  return <OnboardingDialogContent onClose={onClose} />;
}

/** Mounted only while open, so each opening loads fresh readiness. */
function OnboardingDialogContent({ onClose }: { onClose(): void }) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadOnboardingReadiness()
      .then(readiness => { if (!cancelled) setLoad(readiness ? { status: "ready", readiness } : { status: "error" }); })
      .catch(() => { if (!cancelled) setLoad({ status: "error" }); });
    return () => { cancelled = true; };
  }, []);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className={`flex max-h-[calc(100dvh-2rem)] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl ${touchDialogClose}`}>
      <DialogHeader className="mb-0 shrink-0 border-b px-4 py-4 sm:px-6"><DialogTitle>Onboarding</DialogTitle></DialogHeader>
      {load.status === "loading" && <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading setup</p>}
      {load.status === "error" && <p role="alert" className="p-6 text-sm">Setup status is unavailable. Try again.</p>}
      {load.status === "ready" && (load.readiness.canStartFirstCompany
        ? <OnboardingSetup sampleAvailable={load.readiness.sampleWorkspaceAvailable} />
        : <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {load.readiness.companies.length > 0
              ? <ReadinessChecklist companies={load.readiness.companies} />
              : <p className="text-sm">Workspace setup is available to company administrators.</p>}
          </div>)}
    </DialogContent>
  </Dialog>;
}
