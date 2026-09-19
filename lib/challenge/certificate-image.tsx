import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { cohortLabel, formatDate, type Certificate } from "@/lib/challenge/certificate";
import { OFFER } from "@/lib/constants/offer";

/**
 * Draws a certificate as a PNG, A4 landscape proportions at print resolution.
 * Used by the download route; the same layout as CertificateCard on screen.
 */

const WIDTH = 2000;
const HEIGHT = 1414;

const INK = "#0B0B0B";
const CREAM = "#FAF7F0";
const YELLOW = "#F5C400";
const GREY = "#6B6B6B";

function asset(...parts: string[]) {
  return readFile(join(process.cwd(), ...parts));
}

export function certificateFileName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `Operator-Forge-Certificate${slug ? `-${slug}` : ""}.png`;
}

export async function renderCertificateImage(certificate: Certificate, verifyUrl: string): Promise<ImageResponse> {
  const [regular, bold, mono, logo] = await Promise.all([
    asset("assets", "fonts", "Geist-Regular.ttf"),
    asset("assets", "fonts", "Geist-Bold.ttf"),
    asset("assets", "fonts", "GeistMono-Medium.ttf"),
    asset("public", "logo.png"),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const nameSize = certificate.fullName.length > 28 ? 88 : certificate.fullName.length > 20 ? 104 : 120;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: YELLOW, padding: 44, fontFamily: "Geist" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: CREAM,
            border: `10px solid ${INK}`,
            borderRadius: 36,
            padding: "72px 110px",
            position: "relative",
          }}
        >
          {/* Header: the mark and the name */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 20,
                  background: INK,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: 66, height: 66, display: "flex", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} width={205} height={77} style={{ marginTop: -5 }} alt="" />
                </div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 700, color: INK, letterSpacing: -1 }}>Operator Forge</div>
            </div>
            <div style={{ fontFamily: "Geist Mono", fontSize: 24, color: GREY, letterSpacing: 2 }}>
              {certificate.code}
            </div>
          </div>

          {/* Body */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 100 }}>
            <div style={{ fontFamily: "Geist Mono", fontSize: 30, letterSpacing: 12, color: GREY }}>
              CERTIFICATE OF COMPLETION
            </div>
            <div style={{ fontSize: 34, color: GREY, marginTop: 44 }}>This certifies that</div>
            <div
              style={{
                fontSize: nameSize,
                fontWeight: 700,
                color: INK,
                letterSpacing: -3,
                marginTop: 14,
                paddingBottom: 18,
                borderBottom: `4px solid ${YELLOW}`,
                maxWidth: 1600,
                textAlign: "center",
              }}
            >
              {certificate.fullName}
            </div>
            <div style={{ fontSize: 34, color: "#3D3D3D", marginTop: 40 }}>has successfully completed the</div>
            <div style={{ fontSize: 58, fontWeight: 700, color: INK, letterSpacing: -1.5, marginTop: 10 }}>
              {OFFER.name}
            </div>
            <div style={{ fontSize: 32, color: "#3D3D3D", marginTop: 14 }}>
              {`Five live quick-commerce operations simulations · ${cohortLabel(certificate.cohort)}`}
            </div>
          </div>

          {/* Footer: date, verification, seal */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: INK }}>{formatDate(certificate.completedAt)}</div>
              <div style={{ width: 380, height: 3, background: INK, opacity: 0.25, marginTop: 12 }} />
              <div style={{ fontFamily: "Geist Mono", fontSize: 20, letterSpacing: 4, color: GREY, marginTop: 12 }}>
                DATE OF COMPLETION
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 170,
                  height: 170,
                  borderRadius: 999,
                  background: YELLOW,
                  border: `8px solid ${INK}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 60, fontWeight: 700, color: INK, lineHeight: 1 }}>7</div>
                <div style={{ fontFamily: "Geist Mono", fontSize: 18, letterSpacing: 3, color: INK, marginTop: 4 }}>
                  DAYS
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 640 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: INK }}>Operator Forge</div>
              <div style={{ width: 380, height: 3, background: INK, opacity: 0.25, marginTop: 12 }} />
              <div style={{ fontFamily: "Geist Mono", fontSize: 19, letterSpacing: 0, color: GREY, marginTop: 12, whiteSpace: "nowrap" }}>
                {verifyUrl.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
