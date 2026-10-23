import { DEFAULT_STORE_LOGO_ICON } from "@/features/lib/store-logo";
import { LOGO_ICONS } from "./untitled-logo-registry";

/** Untitled UI registry mark used until a contractor picks one. */
export const CONSTRUCTION_DEFAULT_LOGO = (LOGO_ICONS.find(icon => icon.id === "buildingblocks") ?? LOGO_ICONS[0]).lightSvg;

/** The saved logo, or the registry default when none (or the model's family default) is saved. */
export function brandLogoSvg(logoIcon: string | null | undefined) {
  const saved = (logoIcon ?? "").trim();
  return saved && saved !== DEFAULT_STORE_LOGO_ICON ? saved : CONSTRUCTION_DEFAULT_LOGO;
}
