"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useScrolled } from "@/hooks/use-scrolled";
import { FRAMES_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/coins", label: "Coins" },
  { href: "/narratives", label: "Narratives" },
  { href: "/market", label: "Market" },
  { href: "/launchpads", label: "Launchpads" },
  { href: "/research", label: "Research" },
  { href: "/api", label: "API" },
] as const;

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PoweredByFrames({ className }: { className?: string }) {
  return (
    <a
      href={FRAMES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-line-med px-2.5 py-1 text-2xs text-med transition-colors hover:text-high", className)}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-positive" />
      Powered by Frames
    </a>
  );
}

/** Sticky research navigation: same glass surface and wordmark as the landing bar, one link per section. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const scrolled = useScrolled(8);
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-3 z-50 md:top-4">
      <Container>
        <nav aria-label="Primary" className={cn("glass flex items-center justify-between gap-3 pr-2 pl-4 transition-[height,box-shadow] duration-200", scrolled ? "h-12 shadow-md light:shadow-black/8" : "h-14")}>
          <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none" aria-label="LAMBLE research home">
            <Logo />
          </Link>
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active(pathname, l.href) ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center rounded-lg px-3 text-sm text-med transition-colors hover:text-high focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none",
                    active(pathname, l.href) && "bg-surface-3 font-semibold text-high",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            <PoweredByFrames className="hidden sm:inline-flex" />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <MenuIcon />
            </Button>
          </div>
        </nav>
      </Container>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="top" className="rounded-b-2xl">
          <SheetHeader>
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col px-3 pb-2">
            {[{ href: "/", label: "Overview" }, ...NAV, { href: "/methodology", label: "Methodology" }, { href: "/sources", label: "Sources" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={cn("flex h-11 items-center rounded-lg px-3 text-base text-med hover:bg-surface-3 hover:text-high", active(pathname, l.href) && l.href !== "/" && "font-semibold text-high")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-divider px-5 py-4">
            <ThemeToggle />
            <PoweredByFrames />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
