import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BOOTCAMP, COHORT, plain } from "@/lib/constants/operator-bootcamp";

/** The share card for /operator-bootcamp: the headline on off-white, with the brand yellow. */

export const alt = BOOTCAMP.meta.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function font(file: string) {
  return readFile(join(process.cwd(), "assets", "fonts", file));
}

export default async function Image() {
  const [regular, bold] = await Promise.all([font("Geist-Regular.ttf"), font("Geist-Bold.ttf")]);
  const headline = plain(BOOTCAMP.hero.h1);
  const emphasised = BOOTCAMP.hero.h1.find((part) => part.em)?.text ?? "";
  const lead = headline.replace(emphasised, "");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FAFAF7", padding: "64px 72px", fontFamily: "Geist" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, background: "#F5C400" }} />
          <div style={{ display: "flex", fontSize: 26, color: "#111111", fontWeight: 700 }}>{BOOTCAMP.brand.name}</div>
          <div style={{ display: "flex", fontSize: 22, color: "#5C5C57", marginLeft: 8 }}>{BOOTCAMP.hero.title}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 80, lineHeight: 1.04, fontWeight: 700, letterSpacing: -3, color: "#111111" }}>
            <span style={{ display: "flex" }}>{lead}</span>
            <span style={{ display: "flex", background: "#F5C400", padding: "0 12px", marginLeft: -4 }}>{emphasised}</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#3A3A36" }}>{BOOTCAMP.hero.subhead}</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {[...BOOTCAMP.hero.chips.slice(0, 3).map((chip) => chip.label), COHORT].map((chip) => (
            <div key={chip} style={{ display: "flex", border: "2px solid #111111", borderRadius: 999, padding: "8px 20px", fontSize: 24, color: "#111111", fontWeight: 700 }}>
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
