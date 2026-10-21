import type { CSSProperties } from "react";

import { normalizeStoreLogoColor } from "./store-logo";

/**
 * The saved Store Settings logo hue is the storefront theme authority, as in
 * Openfront Restaurant's storefront layout: the brand hue sits 260 degrees past
 * the logo hue-rotation, which keeps the default indigo mark and the derived
 * accent aligned. Lightness is fixed so paper-coloured text on the accent and
 * accent-coloured text on paper both stay readable for every hue.
 */
export const STORE_BRAND_HUE_OFFSET = 260;

export type StorefrontThemeTokens = {
  "--sf-brand-hue": string;
  "--sf-accent": string;
  "--sf-accent-strong": string;
  "--sf-accent-ink": string;
  "--sf-focus": string;
};

export function storeBrandHue(logoColor: unknown): number {
  const hue = (STORE_BRAND_HUE_OFFSET + Number.parseFloat(normalizeStoreLogoColor(logoColor))) % 360;
  return Math.round(hue * 100) / 100;
}

/** Inline-style form of the tokens, usable directly as a React `style`. */
export type StorefrontThemeStyle = CSSProperties & StorefrontThemeTokens;

export function storefrontThemeTokens(logoColor: unknown): StorefrontThemeStyle {
  const hue = storeBrandHue(logoColor);
  return {
    "--sf-brand-hue": String(hue),
    "--sf-accent": `oklch(0.45 0.14 ${hue})`,
    "--sf-accent-strong": `oklch(0.38 0.13 ${hue})`,
    "--sf-accent-ink": "oklch(0.98 0.01 70)",
    "--sf-focus": `oklch(0.5 0.14 ${hue})`,
  };
}
