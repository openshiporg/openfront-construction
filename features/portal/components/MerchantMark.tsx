import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";

/** The contractor's saved Store Settings logo and hue; initials only when no logo is saved. */
export function MerchantMark({ logoIcon, logoColor, brandColor, initials, className = "size-9" }: {
  logoIcon?: string | null;
  logoColor?: string | null;
  brandColor: string;
  initials: string;
  className?: string;
}) {
  const safe = sanitizeStoreLogoSvg(logoIcon || "");
  if (safe) {
    return <span aria-hidden="true" className={`block shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full ${className}`}
      style={{ filter: `hue-rotate(${normalizeStoreLogoColor(logoColor)}deg)` }} dangerouslySetInnerHTML={{ __html: safe }} />;
  }
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${className}`} style={{ backgroundColor: brandColor }}>{initials}</span>;
}
