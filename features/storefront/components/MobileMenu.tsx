"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Phone and tablet menu: a full-height sheet under the header. It closes on
 * navigation, on Escape and from its own button, and holds the page still while open. */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  // Open is remembered against the page it was opened on, so any navigation closes it.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpenOn(null); button.current?.focus(); } };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onWide = () => { if (desktop.matches) setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWide);
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <div className="sf-menu">
      <button ref={button} type="button" className="sf-menu__btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sf-menu-panel" onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      {open && (
        // A tap on any link closes the sheet, including a link to the page already open.
        <nav id="sf-menu-panel" aria-label="Menu" className="sf-menu__panel" onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
          {children}
        </nav>
      )}
    </div>
  );
}
