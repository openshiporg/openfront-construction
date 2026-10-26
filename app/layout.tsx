import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
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

// Storefront type, from the card catalog of the libraries and schools the firm builds: Public Sans
// (a civic workhorse) for headings and everything read; Source Serif 4 for the typed card records.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} ${publicSans.variable} ${sourceSerif.variable} antialiased min-h-screen bg-background font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
