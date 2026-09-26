"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isLight = mounted && resolvedTheme === "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </Button>
  );
}
