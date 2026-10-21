import { safeInternalRedirectPath } from "@/features/lib/safe-redirect";

// Customer routes a sign-in may resume. Ownership is re-checked at the destination.
const CUSTOMER_DESTINATIONS = [/^\/account(?:[/?#]|$)/, /^\/portal(?:[/?#]|$)/, /^\/accept-invitation(?:[?#]|$)/];

export function customerContinuation(value: string | null | undefined, fallback = "/account"): string {
  const path = safeInternalRedirectPath(value, "");
  if (path.startsWith("/account/reset")) return fallback;
  return path && CUSTOMER_DESTINATIONS.some(pattern => pattern.test(path)) ? path : fallback;
}
