import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import "@/features/storefront/storefront.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Storefront display face: Archivo's width axis gives the condensed site-board headings.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Construction Contractor",
    template: "%s",
  },
  description: "A general contractor's public website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.svg" rel="icon" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${plexSans.variable} ${plexMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
