const INTERNAL_ORIGIN = "https://internal.invalid";

export function safeInternalRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const target = new URL(value, INTERNAL_ORIGIN);
    if (target.origin !== INTERNAL_ORIGIN || target.username || target.password) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
