import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Share card in the LAMBLE identity (dark surface, green mark). Every figure passed in comes from the published
 * release; the card never computes or rounds anything the page does not show.
 */
export function ogCard({ eyebrow, title, stats, footer }: { eyebrow: string; title: string; stats: { label: string; value: string }[]; footer: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#0e0f14", color: "#f4f4f6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "#00c278", display: "flex", alignItems: "center", justifyContent: "center", color: "#14151b", fontWeight: 700, fontSize: 26 }}>L</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>LAMBLE</div>
          <div style={{ fontSize: 22, color: "#969faf", marginLeft: 8 }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: title.length > 48 ? 52 : 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
          <div style={{ display: "flex", gap: 48 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 22, color: "#969faf" }}>{s.label}</div>
                <div style={{ fontSize: 40, fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#969faf" }}>
          <span>{footer}</span>
          <span>Powered by Frames</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
