import { ImageResponse } from "next/og";

export const ogAlt = "オシヤリ｜推し活やりくり — 推しに使ったお金が“バイト何時間ぶん”かわかるアプリ";
export const ogSize = { width: 1200, height: 630 };

// Google Fonts から日本語フォント(Noto Sans JP)を必要な文字だけ取得
async function loadJpFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const m = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    if (res.status !== 200) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function renderOgImage() {
  const title = "オシヤリ";
  const tagline = "推しに使ったお金が、";
  const tagline2 = "“バイト何時間ぶん”かわかる";
  const sub = "推し活のお金管理アプリ ・ 登録なし・無料";
  const allText = title + tagline + tagline2 + sub + "¥";
  const font = await loadJpFont(allText);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
          color: "#ffffff",
          padding: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 30,
              background: "rgba(255,255,255,0.95)",
              color: "#db2777",
              fontSize: 78,
              fontWeight: 700,
            }}
          >
            ¥
          </div>
          <div style={{ fontSize: 84, fontWeight: 700 }}>{title}</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, textAlign: "center", lineHeight: 1.35 }}>{tagline}</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.35,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "10px 28px",
            marginTop: 8,
          }}
        >
          {tagline2}
        </div>
        <div style={{ fontSize: 34, marginTop: 40, opacity: 0.92 }}>{sub}</div>
      </div>
    ),
    {
      ...ogSize,
      fonts: font ? [{ name: "Noto Sans JP", data: font, style: "normal" as const, weight: 700 as const }] : undefined,
    }
  );
}
