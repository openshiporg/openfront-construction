"use client";

import * as React from "react";
import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  href: string;
  title: string;
  description: string;
}

interface CommonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function InfoCardTitle({ children, className, ...props }: CommonCardProps) {
  return <div className={cn("mb-1 font-medium", className)} {...props}>{children}</div>;
}

function InfoCardDescription({ children, className, ...props }: CommonCardProps) {
  return <div className={cn("leading-4 text-muted-foreground", className)} {...props}>{children}</div>;
}

function InfoCardContent({ children, className, ...props }: CommonCardProps) {
  return <div className={cn("flex flex-col gap-1 text-xs", className)} {...props}>{children}</div>;
}

/** The family InfoCard footer. It also opens on keyboard focus and stays open
 * on touch screens, so Get started and Skip are never hover-only. */
function InfoCardFooter({ children, className, isHovered }: CommonCardProps & { isHovered: boolean }) {
  return (
    <div
      className={cn(
        "mt-2 flex justify-between overflow-hidden text-xs text-muted-foreground transition-all duration-300 ease-spring",
        "group-focus-within:max-h-[60px] group-focus-within:opacity-100 [@media(hover:none)]:max-h-[60px] [@media(hover:none)]:opacity-100",
        isHovered ? "max-h-[60px] opacity-100" : "max-h-0 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OnboardingCards({ steps, onboardingStatus, onDismiss, onOpenDialog, userRole }: {
  steps: OnboardingStep[];
  onboardingStatus?: string;
  onDismiss(): void | Promise<void>;
  onOpenDialog?(): void;
  userRole?: { canManageOnboarding?: boolean } | null;
}) {
  if (!userRole?.canManageOnboarding) return null;
  if (onboardingStatus === "completed" || onboardingStatus === "dismissed") return null;
  return (
    <div className="w-full">
      {steps.map(({ href, title, description }) => (
        <OnboardingCard key={href} title={title} description={description} onDismiss={onDismiss} onOpenDialog={onOpenDialog} />
      ))}
    </div>
  );
}

function OnboardingCard({ title, description, onDismiss, onOpenDialog }: {
  title: string;
  description: string;
  onDismiss(): void | Promise<void>;
  onOpenDialog?(): void;
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);
  if (isDismissed) return null;
  const handleDismiss = () => {
    setIsDismissed(true);
    void onDismiss();
  };
  return (
    <>
      <div
        className="group relative rounded-lg border bg-white transition-all duration-300 ease-spring hover:shadow-sm dark:bg-black group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute -right-1.5 -top-1 z-10" aria-hidden="true">
          <div className="size-3 animate-pulse rounded-full border-3 border-blue-200 bg-blue-700 dark:border-blue-800/50 dark:bg-blue-400" />
        </div>
        <div className="flex items-start">
          <InfoCardContent className="px-2 pt-2">
            <InfoCardTitle>{title}</InfoCardTitle>
            <InfoCardDescription>{description}</InfoCardDescription>
          </InfoCardContent>
        </div>
        <InfoCardFooter isHovered={isHovered}>
          <div className="m-2 space-x-2">
            <Button size="sm" onClick={onOpenDialog} className="h-6 text-xs [@media(pointer:coarse)]:h-11">Get started</Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 text-xs [@media(pointer:coarse)]:h-11">Skip for now</Button>
          </div>
        </InfoCardFooter>
      </div>

      <div className="relative hidden group-has-[[data-collapsible=icon]]/sidebar-wrapper:block">
        <div className="absolute -right-1.5 -top-1 z-10" aria-hidden="true">
          <div className="size-3 animate-pulse rounded-full border-3 border-blue-200 bg-blue-700 dark:border-blue-800/50 dark:bg-blue-400" />
        </div>
        <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={onOpenDialog} aria-label="Onboarding">
          <Rocket className="size-3" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}
