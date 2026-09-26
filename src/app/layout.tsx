import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TooltipProvider } from "@/components/ui/tooltip";

// Self-hosted Inter variable (https://rsms.me/inter): no build-time fetch, full cv01/cv03/cv04/cv09 feature set.
const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LAMBLE — Meta Launchpad",
    template: "%s · LAMBLE",
  },
  description:
    "LAMBLE routes your token launch to the launchpad where it has the best odds: live launchpad screener, current narratives, one deploy flow.",
  openGraph: {
    title: "LAMBLE — Meta Launchpad",
    description: "Route your token launch to the launchpad with highest odds of success.",
    siteName: "LAMBLE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LAMBLE — Meta Launchpad",
    description: "Route your token launch to the launchpad with highest odds of success.",
  },
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
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
