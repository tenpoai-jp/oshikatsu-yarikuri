import type { MetadataRoute } from "next";

// PWA（ホーム画面に追加）の設定
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "オシヤリ｜推し活やりくり",
    short_name: "オシヤリ",
    description: "推しに使ったお金が“バイト何時間ぶん”かわかる、推し活のお金管理アプリ。",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf2f8",
    theme_color: "#ec4899",
    lang: "ja",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
