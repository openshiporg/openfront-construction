import Link from "next/link";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { brandLogoSvg } from "@/features/platform/store-settings/lib/brand-logo";

/** Shared family SVG lockup: header, mobile menu and footer. The mark is the
 * saved Untitled UI registry logo, hue-rotated to brass (Fomalhaut) through CSS. */
export function StoreBrand({ name, logoIcon, logoColor: _logoColor, className = "" }: {
  name: string;
  logoIcon?: string | null;
  logoColor?: string | null;
  className?: string;
}) {
  const safe = sanitizeStoreLogoSvg(brandLogoSvg(logoIcon));
  return <Link href="/" aria-label={`${name} home`} className={`sf-brand ${className}`.trim()}>
    {safe && <span aria-hidden="true" className="sf-brand__mark" dangerouslySetInnerHTML={{ __html: safe }} />}
    <span className="sf-brand__name">{name}</span>
  </Link>;
}
