import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import type { CandidateProfile } from "./server";

/**
 * The candidate's profile as a PNG.
 *
 * The same things the page shows and nothing more: readiness, the five
 * competencies, the strongest evidence, the development area and what to do
 * about it. Drawn on request from the saved attempt, so it always matches the
 * page.
 *
 * Satori has no cascade and no block layout, so every div sets its own
 * display, and any text built from more than one value is assembled into a
 * single string first. Leaving either out throws at render time.
 */

const WIDTH = 1240;

const INK = "#0A0B0D";
const PANEL = "#121418";
const LINE = "#23262C";
const HI = "#F4F5F7";
const MID = "#A5AAB3";
const FAINT = "#6A707A";
const EMBER = "#F5C400";
const TEAL = "#24D9B5";
const ORANGE = "#FF8A3D";

function asset(...parts: string[]) {
  return readFile(join(process.cwd(), ...parts));
}

const label = {
  display: "flex",
  fontFamily: "GeistMono",
  fontSize: 16,
  letterSpacing: 3,
  color: FAINT,
  textTransform: "uppercase",
} as const;

const panel = {
  display: "flex",
  flexDirection: "column",
  backgroundColor: PANEL,
  border: `2px solid ${LINE}`,
  borderRadius: 18,
  padding: 26,
} as const;

/** Roughly how many lines a string takes at a given width, to size the canvas. */
function linesFor(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

export async function renderCandidateProfileImage(profile: CandidateProfile, email: string): Promise<ImageResponse> {
  const [regular, bold, mono] = await Promise.all([
    asset("assets", "fonts", "Geist-Regular.ttf"),
    asset("assets", "fonts", "Geist-Bold.ttf"),
    asset("assets", "fonts", "GeistMono-Medium.ttf"),
  ]);

  // The text varies in length from one candidate to the next, so the height does too.
  const strongestLines = profile.strongest.reduce((sum, item) => sum + linesFor(item.title, 62) + linesFor(item.text, 86), 0);
  const adviceLines = profile.recommendations.reduce((sum, item) => sum + linesFor(item, 80), 0);
  const height =
    430 +
    profile.competencies.length * 64 +
    (profile.strongest.length ? 110 + strongestLines * 34 + profile.strongest.length * 18 : 0) +
    230 + linesFor(profile.development.text, 86) * 30 + adviceLines * 34 + profile.recommendations.length * 16 +
    (profile.timedOut ? 70 : 0) +
    150;

  const readiness = String(profile.overall);
  const timedOutNote = `The time ran out before the shift did. Built from the ${profile.observed} of ${profile.opportunities} assessed moments reached.`;
  const footer = "From one 30-minute simulated shift. One input to a hiring decision, alongside an interview. operatorforge.in";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: WIDTH,
          height,
          flexDirection: "column",
          backgroundColor: INK,
          padding: 56,
          fontFamily: "Geist",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...label, fontSize: 20, letterSpacing: 4, color: EMBER }}>Operator Forge · Hiring Test</div>
          <div style={{ display: "flex", marginTop: 14, fontFamily: "GeistBold", fontSize: 56, letterSpacing: -2, color: HI }}>
            Dark Store Manager Profile
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 23, color: MID }}>{email}</div>
        </div>

        {profile.timedOut ? (
          <div style={{ display: "flex", marginTop: 22, fontSize: 20, color: MID }}>
            {timedOutNote}
          </div>
        ) : null}

        {/* ── Readiness and signature ──────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
          <div style={{ ...panel, flex: 1, backgroundColor: "#1A1710", border: `2px solid ${EMBER}55` }}>
            <div style={label}>Readiness</div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
              <div style={{ display: "flex", fontFamily: "GeistBold", fontSize: 104, letterSpacing: -5, color: HI, lineHeight: 1 }}>
                {readiness}
              </div>
              <div style={{ display: "flex", marginLeft: 10, marginBottom: 14, fontSize: 28, color: FAINT }}>/ 100</div>
            </div>
            <div style={{ ...label, marginTop: 18 }}>How the shift ended</div>
            <div style={{ display: "flex", marginTop: 6, fontFamily: "GeistBold", fontSize: 24, color: HI }}>{profile.outcomeTitle}</div>
          </div>

          <div style={{ ...panel, flex: 1.25 }}>
            <div style={label}>Decision signature</div>
            <div style={{ display: "flex", marginTop: 12, fontFamily: "GeistBold", fontSize: 32, color: EMBER }}>
              {profile.signature.name}
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 22, lineHeight: 1.4, color: MID }}>{profile.signature.blurb}</div>
          </div>
        </div>

        {/* ── Five competencies ────────────────────────────────────── */}
        <div style={{ ...panel, marginTop: 16 }}>
          <div style={label}>Five competencies</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14, gap: 18 }}>
            {profile.competencies.map((competency) => (
              <div key={competency.id} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", fontSize: 24, color: HI }}>
                    {competency.observed > 0 && competency.observed < competency.opportunities
                      ? `${competency.label}  ·  from ${competency.observed} of ${competency.opportunities} moments`
                      : competency.label}
                  </div>
                  <div style={{ display: "flex", fontFamily: "GeistBold", fontSize: 26, color: competency.observed ? HI : FAINT }}>
                    {competency.observed ? String(competency.score) : "Not reached"}
                  </div>
                </div>
                <div style={{ display: "flex", marginTop: 8, height: 8, borderRadius: 4, backgroundColor: "#2A2E35" }}>
                  <div
                    style={{
                      display: "flex",
                      width: `${competency.observed ? Math.max(1, competency.score) : 0}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: competency.score >= 70 ? TEAL : competency.score >= 45 ? EMBER : ORANGE,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Strongest evidence ───────────────────────────────────── */}
        {profile.strongest.length ? (
          <div style={{ ...panel, marginTop: 16 }}>
            <div style={label}>Strongest operating evidence</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 14, gap: 16 }}>
              {profile.strongest.map((item) => (
                <div key={item.title} style={{ display: "flex", flexDirection: "column", borderLeft: `4px solid ${TEAL}`, paddingLeft: 18 }}>
                  <div style={{ display: "flex", fontFamily: "GeistBold", fontSize: 24, color: HI }}>{item.title}</div>
                  <div style={{ display: "flex", marginTop: 4, fontSize: 21, lineHeight: 1.35, color: MID }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Development ──────────────────────────────────────────── */}
        <div style={{ ...panel, marginTop: 16 }}>
          <div style={label}>Development area</div>
          <div style={{ display: "flex", marginTop: 10, fontFamily: "GeistBold", fontSize: 30, color: HI }}>{profile.development.label}</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 21, lineHeight: 1.35, color: MID }}>{profile.development.text}</div>

          {profile.recommendations.length ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
              <div style={label}>Three things to work on</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 12, gap: 14 }}>
                {profile.recommendations.map((recommendation, index) => (
                  <div key={recommendation} style={{ display: "flex", gap: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 17,
                        border: `2px solid ${LINE}`,
                        fontFamily: "GeistMono",
                        fontSize: 17,
                        color: MID,
                      }}
                    >
                      {String(index + 1)}
                    </div>
                    <div style={{ display: "flex", flex: 1, fontSize: 22, lineHeight: 1.4, color: HI }}>{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 26, fontSize: 18, color: FAINT }}>{footer}</div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "GeistBold", data: bold, weight: 700, style: "normal" },
        { name: "GeistMono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
