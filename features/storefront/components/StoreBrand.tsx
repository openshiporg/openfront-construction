import Link from "next/link";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";

/** Shared family SVG lockup: header, mobile menu, footer and settings. */
export function StoreBrand({ name, logoIcon, logoColor, className = "" }: {
  name: string;
  logoIcon?: string | null;
  logoColor?: string | null;
  className?: string;
}) {
  const safe = sanitizeStoreLogoSvg(logoIcon || "");
  return <Link href="/" aria-label={`${name} home`} className={`inline-flex min-h-11 min-w-0 items-center gap-3 ${className}`}>
    {safe && <span aria-hidden="true" className="block size-10 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full"
      style={{ filter: `hue-rotate(${normalizeStoreLogoColor(logoColor)}deg)` }} dangerouslySetInnerHTML={{ __html: safe }} />}
    <span className="min-w-0 break-words">{name}</span>
  </Link>;
}
