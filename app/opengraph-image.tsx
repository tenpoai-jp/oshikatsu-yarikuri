import { ogAlt, ogSize, renderOgImage } from "@/lib/ogImage";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgImage();
}
