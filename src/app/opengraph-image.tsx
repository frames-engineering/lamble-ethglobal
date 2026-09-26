import { ImageResponse } from "next/og";

export const alt = "LAMBLE — Meta Launchpad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0e0f14",
          color: "#f4f4f6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#00c278",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#14151b",
              fontWeight: 700,
              fontSize: 26,
            }}
          >
            L
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>LAMBLE</div>
          <div style={{ fontSize: 22, color: "#969faf", marginLeft: 8 }}>Meta Launchpad</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Route your token launch to the launchpad with highest odds of success.</div>
          <div style={{ fontSize: 30, color: "#969faf", lineHeight: 1.3 }}>
            Intelligence for optimizing your launch before it hits the market.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 22, color: "#969faf" }}>
          <span>19 launchpads</span>
          <span>·</span>
          <span>10 chains</span>
          <span>·</span>
          <span>pump.fun, BONK.fun, Bags, Meteora DBC, LaunchLab, four.meme, clanker</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
