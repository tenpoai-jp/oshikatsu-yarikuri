import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://oshikatsu-yarikuri.vercel.app";
const TITLE = "オシヤリ｜推し活やりくり";
const DESC = "推しに使ったお金が“バイト何時間ぶん”かわかる、推し活専用のお金管理アプリ。出費・予算・バイト収入・貯金目標をまとめて管理。登録なし・無料。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  keywords: ["推し活", "推し活 アプリ", "推し活 家計簿", "推し活 お金 管理", "推し活 予算", "オタ活 節約", "課金 管理"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  verification: {
    google: "dEuZXflOYsz-RV3D-BbB8AovdyYTUJa9lyWcyBYcgpQ",
  },
};

export const viewport = {
  themeColor: "#ec4899",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}
