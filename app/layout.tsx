import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono, Jost } from "next/font/google";
import "./globals.css";
import "@/features/storefront/catalog.css";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Storefront type (Fomalhaut): Jost, a light refined sans, for everything; Cormorant Garamond italic for quotes.
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400", "500"] });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500"], style: ["italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicStorefrontMetadata();
  return {
    ...site,
    title: { default: String((site.title as { absolute: string }).absolute), template: "%s" },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jost.variable} ${cormorant.variable} antialiased min-h-screen bg-background font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
