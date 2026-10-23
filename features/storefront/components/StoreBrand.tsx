import Link from "next/link";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";
import { brandLogoSvg } from "@/features/platform/store-settings/lib/brand-logo";

/** Shared family SVG lockup: header, mobile menu and footer. The mark is the
 * saved Untitled UI registry logo, hue-rotated to the saved colour. */
export function StoreBrand({ name, logoIcon, logoColor, className = "" }: {
  name: string;
  logoIcon?: string | null;
  logoColor?: string | null;
  className?: string;
}) {
  const safe = sanitizeStoreLogoSvg(brandLogoSvg(logoIcon));
  return <Link href="/" aria-label={`${name} home`} className={`sf-brand ${className}`.trim()}>
    {safe && <span aria-hidden="true" className="sf-brand__mark"
      style={{ filter: `hue-rotate(${normalizeStoreLogoColor(logoColor)}deg)` }} dangerouslySetInnerHTML={{ __html: safe }} />}
    <span className="sf-brand__name">{name}</span>
  </Link>;
}
