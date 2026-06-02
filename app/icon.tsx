import { ImageResponse } from "next/og";

// アプリのアイコン（タブ/favicon、ホーム画面追加でも使用）
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 360,
            height: 360,
            borderRadius: 90,
            background: "rgba(255,255,255,0.95)",
            color: "#db2777",
            fontSize: 230,
            fontWeight: 800,
          }}
        >
          ¥
        </div>
      </div>
    ),
    { ...size }
  );
}
