"use client";

import type { ShaderLabConfig } from "@basementstudio/shader-lab";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/** One cut per theme: the light one is a daytime take of the same scene. */
const VIDEO_SRC = { dark: "/video/hero.mp4", light: "/video/hero-light.mp4" } as const;
type Theme = keyof typeof VIDEO_SRC;
/** Half speed: the runtime applies it to its own video element, the fallback sets it on mount. */
const PLAYBACK_RATE = 0.5;

/**
 * Shader Lab export (basement.studio editor), top layer first. Changes from the export: the
 * asset path and a pixel-trail layer on top that turns the candles into blocks under the
 * pointer. The ASCII layer ships hidden exactly as exported so it can be toggled.
 *
 * No composition size on purpose: the runtime then lays the cell grids over the box's CSS
 * pixels, exactly like the editor preview, so cells are 8 CSS px and trail blocks 24 CSS px on
 * any screen, and the renderer resizes itself every frame instead of restarting.
 */
function buildConfig(src: string): ShaderLabConfig {
  return {
    layers: [
      {
        blendMode: "normal",
        compositeMode: "filter",
        maskConfig: { invert: false, mode: "multiply", source: "luminance" },
        hue: 0,
        id: "b7d2f4c1-5e6a-4d3b-9c8e-2f1a0b3c4d5e",
        kind: "source",
        name: "Pixel trail",
        opacity: 1,
        // Turns the candles under the pointer into solid blocks. Each trail cell is painted with one sample
        // taken at its centre, so the cell is 3 pattern cells (24 CSS px) wide: the centre lands on the
        // middle candle, which is always lit, never on the black gap. No warp, or samples would drift into gaps.
        // radius is a fraction of the shorter grid side; decay maps to ~1.2 s of life.
        params: { cellSize: 24, radius: 0.06, decay: 0.9, displaceAmount: 0, intensity: 1 },
        saturation: 1,
        type: "pixel-trail",
        visible: true,
      },
      {
        blendMode: "normal",
        compositeMode: "filter",
        maskConfig: { invert: false, mode: "multiply", source: "luminance" },
        hue: 0,
        id: "9fc2a42a-48a0-4126-87fa-7ca9e4af4b47",
        kind: "effect",
        name: "Pattern",
        opacity: 1,
        params: {
          cellSize: 8,
          preset: "candles",
          colorMode: "source",
          monoColor: "#f5f5f0",
          bgOpacity: 0,
          invert: false,
          customColorCount: 4,
          customLuminanceBias: 0,
          customBgColor: "#F5F5F0",
          customColor1: "#0d1014",
          customColor2: "#4d5057",
          customColor3: "#969aa2",
          customColor4: "#e1e2de",
          bloomEnabled: false,
          bloomIntensity: 1.25,
          bloomThreshold: 0.6,
          bloomRadius: 6,
          bloomSoftness: 0.35,
        },
        saturation: 1,
        type: "pattern",
        visible: true,
      },
      {
        blendMode: "normal",
        compositeMode: "filter",
        maskConfig: { invert: false, mode: "multiply", source: "luminance" },
        hue: 2,
        id: "40c39149-a3e6-4abc-a5c2-f0f4c7e2e67b",
        kind: "effect",
        name: "ASCII",
        opacity: 1,
        params: {
          bgOpacity: 0.18,
          boldness: 0.26,
          breakGrid: "off",
          breakThreshold: 0.06,
          charset: "light",
          colorMode: "source",
          columns: 215,
          customChars: " .:-=+*#%@",
          fontFamily: "mono",
          fontWeight: 400,
          invert: false,
          monoColor: "#f5f5f0",
          rowWarp: 0,
          signalBlackPoint: 0,
          signalWhitePoint: 1,
        },
        saturation: 1.35,
        type: "ascii",
        visible: false,
      },
      {
        blendMode: "normal",
        compositeMode: "filter",
        maskConfig: { invert: false, mode: "multiply", source: "luminance" },
        hue: 0,
        id: "3de7131d-7d5e-4fe1-9c7a-0bbb26ed4751",
        kind: "source",
        name: "Video",
        opacity: 1,
        params: { fitMode: "cover", scale: 1, offset: [0, 0], playbackRate: PLAYBACK_RATE },
        saturation: 1,
        type: "video",
        visible: true,
        asset: { kind: "video", src },
      },
    ],
    timeline: { duration: 7, loop: true, tracks: [] },
  };
}

// Built once so the references stay stable; a new config object restarts the renderer.
const CONFIGS: Record<Theme, ShaderLabConfig> = {
  dark: buildConfig(VIDEO_SRC.dark),
  light: buildConfig(VIDEO_SRC.light),
};

// three/webgpu is browser-only and heavy, so the runtime loads after mount and only where WebGPU exists.
const ShaderLabComposition = dynamic(
  () => import("@basementstudio/shader-lab").then((mod) => mod.ShaderLabComposition),
  { ssr: false },
);

/** How long the outgoing cut keeps rendering under the incoming one: the blur-in's length (hero-media-enter). */
const CROSSFADE_MS = 1600;

/** Full-bleed hero media: the Shader Lab composition over the launch video, dissolving into the page at the bottom. */
export function HeroVisual({ className }: { className?: string }) {
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  // Cuts mounted right now: `shown` on top, `outgoing` kept alive underneath while the new one blurs in.
  // A WebGPU canvas cannot be snapshotted after presenting, so the crossfade keeps the old renderer
  // running instead. `shown` is null until the stored theme is known, so the wrong cut never flashes.
  const [shown, setShown] = useState<Theme | null>(null);
  const [outgoing, setOutgoing] = useState<Theme | null>(null);
  const outgoingTimer = useRef<number | undefined>(undefined);

  // Stable reference: the composition tears down and re-creates its renderer when this prop changes
  // (the module-level configs are stable for the same reason).
  const onRuntimeError = useCallback((message: string | null) => {
    if (message) setRuntimeFailed(true);
  }, []);

  const theme: Theme | null = resolvedTheme === "light" ? "light" : resolvedTheme === "dark" ? "dark" : null;

  // Theme change: the current cut becomes the outgoing surface and the new one mounts on top with its
  // blur-in; the outgoing one is dropped once that entrance has finished.
  useEffect(() => {
    if (!mounted || theme === null || theme === shown) return;
    const frame = requestAnimationFrame(() => {
      setOutgoing(shown);
      setShown(theme);
      window.clearTimeout(outgoingTimer.current);
      outgoingTimer.current = window.setTimeout(() => setOutgoing(null), CROSSFADE_MS);
    });
    return () => cancelAnimationFrame(frame);
  }, [mounted, theme, shown]);

  useEffect(() => () => window.clearTimeout(outgoingTimer.current), []);

  const showShader = mounted && !runtimeFailed && "gpu" in navigator;
  // Bottom to top. Keyed by theme, so a cut that is toggled back within the crossfade keeps its renderer.
  const surfaces = [outgoing, shown].filter((t): t is Theme => t !== null);

  return (
    <div aria-hidden className={cn("overflow-hidden mask-fade-b", className)}>
      {surfaces.map((cut) =>
        showShader ? (
          <ShaderLabComposition
            key={cut}
            config={CONFIGS[cut]}
            onRuntimeError={onRuntimeError}
            className="hero-media-enter"
            style={{ position: "absolute", inset: 0 }}
          />
        ) : (
          // Plain playback where WebGPU is unavailable or the runtime failed to start.
          <video
            key={cut}
            ref={(el) => {
              if (el) el.playbackRate = PLAYBACK_RATE;
            }}
            className="hero-media-enter absolute inset-0 h-full w-full object-cover"
            src={VIDEO_SRC[cut]}
            autoPlay
            muted
            loop
            playsInline
          />
        ),
      )}
    </div>
  );
}
