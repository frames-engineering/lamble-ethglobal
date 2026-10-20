import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_URL } from "@/lib/links";

// Self-hosted Inter variable (https://rsms.me/inter): no build-time fetch, full cv01/cv03/cv04/cv09 feature set.
const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
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
  themeColor: "#0e0f14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider delay={150}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-surface-3 focus:px-3 focus:py-2 focus:text-sm">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
