"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useActiveSection } from "@/hooks/use-active-section";
import { useEntered } from "@/hooks/use-entered";
import { useScrolled } from "@/hooks/use-scrolled";
import { cn } from "@/lib/utils";

const LINKS = [
  { id: "about", label: "About" },
  { id: "narratives", label: "Narratives" },
  { id: "launchpads", label: "Launchpads" },
] as const;

const IDS = LINKS.map((l) => l.id);

/** Floating navbar: surface-1 glass bar that tightens after the first scroll. */
export function Navbar() {
  const scrolled = useScrolled(8);
  const active = useActiveSection(IDS);
  const [open, setOpen] = useState(false);
  const entered = useEntered();

  return (
    <header data-entered={entered ? "" : undefined} className="hero-enter fixed inset-x-0 top-3 z-50 md:top-4">
      {/* Desktop: the bar is pushed to the hero's right edge; from xl it shares the top line with the title card,
          so both are capped at half the width. */}
      <Container className="lg:max-w-none">
        <nav
          aria-label="Primary"
          className={cn(
            "glass flex items-center justify-between pr-2 pl-4 transition-[height,box-shadow] duration-200 ease-[var(--ease-decelerate)] lg:ml-auto lg:max-w-2xl xl:max-w-[min(42rem,calc(50%-0.75rem))]",
            scrolled ? "h-12 shadow-md" : "h-14",
          )}
        >
          <a href="#about" className="flex items-center rounded-lg focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none">
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "flex h-8 items-center rounded-lg px-3 text-sm text-med transition-colors hover:text-high focus-visible:ring-1 focus-visible:ring-focus focus-visible:outline-none",
                      isActive && "bg-surface-3 font-semibold text-high",
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button type="button" size="sm" className="hidden sm:inline-flex">
              Launch Token
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <MenuIcon />
            </Button>
          </div>
        </nav>
      </Container>

      <Sheet open={open} onOpenChange={(next) => setOpen(next)}>
        <SheetContent side="top" className="rounded-b-2xl">
          <SheetHeader>
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col px-3 pb-2">
            {LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-11 items-center rounded-lg px-3 text-base text-med transition-colors hover:bg-surface-3 hover:text-high",
                    active === link.id && "font-semibold text-high",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-divider px-5 py-4">
            <ThemeToggle />
            <Button type="button" size="default">
              Launch Token
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
