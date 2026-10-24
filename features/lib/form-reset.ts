import type { FormEvent } from "react";

/** React resets a form once its action settles. Keep what was typed unless it saved,
 * so a refused submission can be corrected instead of retyped. */
export function keepUnlessSaved(saved: boolean) {
  return (event: FormEvent<HTMLFormElement>) => {
    if (!saved) event.preventDefault();
  };
}
