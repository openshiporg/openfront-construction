import type { KeyboardEvent } from "react";

/** Native buttons retain Enter/Space; arrow keys move only among painted options. */
export function focusRelationshipOption(event: KeyboardEvent<HTMLElement>): boolean {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return false;
  const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="option"]:not(:disabled)'));
  if (!options.length) return false;
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0 && (event.key === "Home" || event.key === "End")) return false;
  event.preventDefault();
  event.stopPropagation();
  const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
    : event.key === "ArrowDown" ? (index + 1) % options.length : (index <= 0 ? options.length : index) - 1;
  options[next].focus();
  return true;
}
