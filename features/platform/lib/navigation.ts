import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ClipboardCheck,
  FileClock,
  FolderKanban,
  HardHat,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";

export interface PlatformNavItem {
  title: string;
  href: string;
  color: string;
  description: string;
  icon: LucideIcon;
  group?: string;
}

export interface PlatformNavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: PlatformNavItem[];
}

// Platform navigation items, relative to the dashboard basePath, as in the family Sidebar.
export const platformNavItems: PlatformNavItem[] = [
  // Standalone Items
  {
    title: "Portfolio",
    href: "/platform/portfolio",
    color: "orange",
    description: "Company and project health across the authorized portfolio.",
    icon: Building2,
    group: "standalone",
  },
  {
    title: "Projects",
    href: "/platform/projects",
    color: "blue",
    description: "Open a construction project workspace.",
    icon: FolderKanban,
    group: "standalone",
  },
  {
    title: "Setup",
    href: "/platform/setup",
    color: "slate",
    description: "Set up your company and first project.",
    icon: ClipboardCheck,
    group: "standalone",
  },
  {
    title: "Store Settings",
    href: "/platform/store-settings",
    color: "slate",
    description: "Public profile, logo, services and public projects.",
    icon: Store,
    group: "standalone",
  },

  // Pursuits
  {
    title: "Pipeline",
    href: "/platform/pipeline",
    color: "amber",
    description: "Qualify pursuits and manage bid-stage next actions.",
    icon: FileClock,
    group: "pursuits",
  },
  {
    title: "Quote requests",
    href: "/platform/service-requests",
    color: "emerald",
    description: "Review customer scope and issue versioned quotes.",
    icon: FileClock,
    group: "pursuits",
  },
];

export const platformStandaloneItems = platformNavItems.filter(item => item.group === "standalone");

export const platformNavGroups: PlatformNavGroup[] = [
  {
    id: "pursuits",
    title: "Pursuits",
    icon: FileClock,
    items: platformNavItems.filter(item => item.group === "pursuits"),
  },
];

// Helper function to get platform nav items with full paths
export function getPlatformNavItemsWithBasePath(basePath: string) {
  return platformNavItems.map(item => ({
    ...item,
    href: `${basePath}${item.href}`,
  }));
}

// These project tools become links after a project is selected. Keeping their
// metadata here gives the sidebar and project workspace one vocabulary.
export const projectToolNavigation = [
  {
    title: "Project controls",
    icon: Activity,
    items: [
      { title: "Overview", slug: "", icon: Landmark },
      { title: "Preconstruction", slug: "preconstruction", icon: FileClock },
      { title: "Financials", slug: "financials", icon: WalletCards },
      { title: "Contracts & changes", slug: "contracts", icon: ReceiptText },
      { title: "Subcontractors & procurement", slug: "procurement", icon: UsersRound },
    ],
  },
  {
    title: "Build",
    icon: HardHat,
    items: [
      { title: "RFIs & submittals", slug: "execution", icon: FileClock },
      { title: "Field operations", slug: "field", icon: HardHat },
      { title: "Schedule & tasks", slug: "schedule", icon: Activity },
      { title: "Quality & safety", slug: "quality-safety", icon: ClipboardCheck },
      { title: "Documents", slug: "documents", icon: FolderKanban },
    ],
  },
  {
    title: "Closeout",
    icon: ShieldCheck,
    items: [
      { title: "Billing", slug: "billing", icon: ReceiptText },
      { title: "Reports", slug: "reports", icon: Activity },
      { title: "Project team", slug: "team", icon: UsersRound },
      { title: "Audit", slug: "audit", icon: ShieldCheck },
    ],
  },
] as const;

export function projectToolHref(projectId: string, slug: string): string {
  const suffix = slug ? `/${slug}` : "";
  return `/dashboard/platform/projects/${encodeURIComponent(projectId)}${suffix}`;
}
