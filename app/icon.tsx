import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** High-contrast favicon — blue tile, white FH (readable at 16px). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        FH
      </div>
    ),
    { ...size },
  );
}
