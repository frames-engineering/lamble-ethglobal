import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import "./globals.css";
import { SiteFooter } from "@/components/layout/footer";
import { MobileBar, Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotFound, loadRelease } from "@/lib/lamble/service";
import { SITE_URL } from "@/lib/links";

// Self-hosted Geist and Geist Mono variable (https://vercel.com/font): no build-time fetch.
const geist = localFont({
  src: "../fonts/GeistVariable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVariable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});
// Geist Pixel (Square cut, from the `geist` package): page titles only. It ships in a single weight.
const geistPixel = localFont({
  src: "../fonts/GeistPixelSquare.woff2",
  variable: "--font-geist-pixel",
  weight: "500",
  display: "swap",
  adjustFontFallback: false,
});

const description =
  "Research on the crypto trenches: coin pages with holder analysis and a bottoming test, evolving narratives, weekly market editions and launchpad economics. Public pages; structured research API for agents through Frames.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LAMBLE — Trenches research, powered by Frames",
    template: "%s · LAMBLE",
  },
  description,
  alternates: { canonical: "/", types: { "application/rss+xml": "/research/feed.xml", "application/atom+xml": "/research/atom.xml" } },
  openGraph: { title: "LAMBLE — Trenches research", description, siteName: "LAMBLE", type: "website" },
  twitter: { card: "summary_large_image", title: "LAMBLE — Trenches research", description },
};

export const viewport: Viewport = {
  themeColor: "#0e0e0d",
  width: "device-width",
  initialScale: 1,
};

/** The published release's cutoff for the top bar; absent until a release exists. */
function dataCutoff(): string | null {
  try {
    return loadRelease().data.dataCutoff;
  } catch (e) {
    if (e instanceof NotFound) return null;
    throw e;
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${geistPixel.variable} h-full`}>
      <body className="min-h-full">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider delay={150}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-surface-3 focus:px-3 focus:py-2 focus:text-sm">
              Skip to content
            </a>
            <div className="flex min-h-svh">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileBar />
                <TopBar cutoff={dataCutoff()} />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
