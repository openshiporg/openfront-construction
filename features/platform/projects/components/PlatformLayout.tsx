import type { ReactNode } from "react";

/** Layout-transparent boundary for Construction-owned platform screens. Phone
 * touch-target sizing in app/globals.css is scoped to it, so the family
 * dashboard components keep their own sizing and display. */
export function PlatformLayout({ children }: { children: ReactNode }) {
  return <div className="construction-touch contents">{children}</div>;
}
