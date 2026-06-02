import { ImageResponse } from "next/og";

// iOS「ホーム画面に追加」用アイコン
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
          color: "#ffffff",
          fontSize: 110,
          fontWeight: 800,
        }}
      >
        ¥
      </div>
    ),
    { ...size }
  );
}
