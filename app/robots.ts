import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://oshikatsu-yarikuri.vercel.app/sitemap.xml",
  };
}
