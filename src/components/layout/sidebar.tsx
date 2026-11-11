"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  BracesIcon,
  ChartCandlestickIcon,
  ChevronDownIcon,
  CoinsIcon,
  LayersIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  MenuIcon,
  RocketIcon,
  ScrollTextIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useId, useState } from "react";

import { FramesMark } from "@/components/brand/frames-mark";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { FRAMES_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

export const PRIMARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/coins", label: "Coins", icon: CoinsIcon },
  { href: "/narratives", label: "Narratives", icon: LayersIcon },
  { href: "/launchpads", label: "Launchpads", icon: RocketIcon },
  { href: "/market", label: "Market weeks", icon: ChartCandlestickIcon },
  { href: "/research", label: "Research", icon: BookOpenIcon },
];

const GROUPS: { label: string; icon: LucideIcon; links: [string, string][] }[] = [
  {
    label: "Method",
    icon: ScrollTextIcon,
    links: [
      ["Methodology", "/methodology"],
      ["Sources & coverage", "/sources"],
      ["Changes feed", "/api#changes"],
      ["RSS", "/research/feed.xml"],
    ],
  },
  {
    label: "Agents",
    icon: BracesIcon,
    links: [
      ["API & Frames setup", "/api"],
      ["OpenAPI", "/api/v1/openapi.json"],
      ["llms.txt", "/llms.txt"],
    ],
  },
];

const ITEM = "flex items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-150";
const IDLE = "text-med hover:bg-hover hover:text-high";

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0] ?? href;
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

/** Feeds, OpenAPI and llms.txt are route handlers, not pages: plain links, no prefetch. */
function NavLink({ href, className, onNavigate, current, children }: { href: string; className: string; onNavigate?: () => void; current?: boolean; children: ReactNode }) {
  const props = { className, onClick: onNavigate, "aria-current": current ? ("page" as const) : undefined };
  return /\.(xml|json|txt)$/.test(href) ? (
    <a href={href} {...props}>
      {children}
    </a>
  ) : (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

function Group({ label, icon: Icon, links, pathname, onNavigate }: (typeof GROUPS)[number] & { pathname: string; onNavigate?: () => void }) {
  const holdsCurrent = links.some(([, href]) => !href.includes("#") && isActive(pathname, href));
  const [open, setOpen] = useState(holdsCurrent);
  const id = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={cn(ITEM, IDLE, "h-9 w-full")}>
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 transition-transform duration-150 ease-out", open && "rotate-180")} />
      </button>
      <ul id={id} hidden={!open} className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-line pl-2">
        {links.map(([text, href]) => {
          const current = !href.includes("#") && isActive(pathname, href);
          return (
            <li key={href}>
              <NavLink href={href} onNavigate={onNavigate} current={current} className={cn(ITEM, "h-8", current ? "bg-active text-high" : IDLE)}>
                {text}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Everything in the sidebar, shared by the desktop rail and the phone drawer. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/" aria-label="LAMBLE home" onClick={onNavigate} className="flex items-center rounded-md">
          <Logo className="h-3.5" />
        </Link>
      </div>
      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const current = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} onClick={onNavigate} aria-current={current ? "page" : undefined} className={cn(ITEM, "h-9 font-medium", current ? "bg-active text-high" : IDLE)}>
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-col gap-0.5">
          {GROUPS.map((g) => (
            <Group key={g.label} {...g} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
      <div className="flex shrink-0 flex-col gap-3 p-2">
        {/* The whole card is the link: no separate button. The arrow says it leaves the site. */}
        <a
          href={FRAMES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-sm bg-background p-3 transition-colors duration-150 outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus"
        >
          <span className="flex items-center justify-between text-xs text-med">
            Data powered by
            <ArrowUpRightIcon aria-hidden className="size-3.5 text-low transition-colors duration-150 group-hover:text-high" />
          </span>
          {/* The logo sits beside the name like a favicon beside a URL; the line on what Frames does goes under. */}
          <span className="mt-2 flex items-center gap-1.5">
            <FramesMark className="size-4 rounded-xs" />
            <span className="text-sm leading-tight font-medium text-high">Frames.ag</span>
          </span>
          <span className="mt-1 block text-xs leading-snug text-med">Connect AIs to any paid endpoints</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <div className="flex items-center justify-end pr-1 pl-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

/** Desktop: a sticky 240px rail holding every menu. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 bg-surface-1 lg:block">
      <SidebarBody />
    </aside>
  );
}

/** Phones and tablets: a bar with the wordmark and a drawer holding the same sidebar. */
export function MobileBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-background px-5 lg:hidden">
      <Link href="/" aria-label="LAMBLE home" className="flex items-center">
        <Logo className="h-3" />
      </Link>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger aria-label="Open menu" className="-mr-2 flex size-11 items-center justify-center rounded-md text-med hover:text-high">
          <MenuIcon aria-hidden className="size-5" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-overlay transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface-1 text-sm text-high outline-none transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:-translate-x-full data-[ending-style]:duration-200 data-[starting-style]:-translate-x-full motion-reduce:transition-none">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Dialog.Close aria-label="Close menu" className="absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-md text-med hover:text-high">
              <XIcon aria-hidden className="size-5" />
            </Dialog.Close>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
