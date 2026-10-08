import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import type { OperatorProfile } from "@/lib/challenge/day-six/profile";

/**
 * The Operator Profile as a PNG.
 *
 * Portrait, at a size that stays legible pasted into a document or a message
 * thread — the two places this actually ends up. Same layout logic as the
 * screen, drawn with explicit flex because satori has no cascade and no
 * Tailwind.
 */

const WIDTH = 1200;
const HEIGHT = 1900;

const INK = "#0A0B0D";
const PANEL = "#121418";
const LINE = "#23262C";
const HI = "#F4F5F7";
const MID = "#A5AAB3";
const FAINT = "#6A707A";
const EMBER = "#F5C400";

function asset(...parts: string[]) {
  return readFile(join(process.cwd(), ...parts));
}

export function profileFileName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return `Operator-Profile${slug ? `-${slug}` : ""}.png`;
}

export async function renderProfileImage(
  profile: OperatorProfile,
  fullName: string,
): Promise<ImageResponse> {
  const [regular, bold, mono] = await Promise.all([
    asset("assets", "fonts", "Geist-Regular.ttf"),
    asset("assets", "fonts", "Geist-Bold.ttf"),
    asset("assets", "fonts", "GeistMono-Medium.ttf"),
  ]);

  const subtitle = `Operator Profile · ${profile.daysDone} of 5 simulations`;
  const footer = `Built from ${profile.decisionsTaken} recorded decisions across the week. operatorforge.in`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: WIDTH,
          height: HEIGHT,
          flexDirection: "column",
          backgroundColor: INK,
          padding: 64,
          fontFamily: "Geist",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "GeistMono",
              fontSize: 22,
              letterSpacing: 4,
              color: EMBER,
              textTransform: "uppercase",
            }}
          >
            Operator Forge · Day 6
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "GeistBold",
              fontSize: 64,
              letterSpacing: -2,
              color: HI,
            }}
          >
            {fullName}
          </div>
          <div style={{ marginTop: 10, fontSize: 26, color: MID }}>
            {subtitle}
          </div>
        </div>

        {/* ── Signature and score ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 2,
              backgroundColor: "#1A1710",
              border: `2px solid ${EMBER}55`,
              borderRadius: 20,
              padding: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "GeistMono",
                fontSize: 18,
                letterSpacing: 3,
                color: EMBER,
                textTransform: "uppercase",
              }}
            >
              Signature
            </div>
            <div style={{ marginTop: 12, fontFamily: "GeistBold", fontSize: 40, color: HI }}>
              {profile.signature.name}
            </div>
            <div style={{ marginTop: 10, fontSize: 24, lineHeight: 1.4, color: MID }}>
              {profile.signature.blurb}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: PANEL,
              border: `2px solid ${LINE}`,
              borderRadius: 20,
              padding: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "GeistMono",
                fontSize: 18,
                letterSpacing: 3,
                color: FAINT,
                textTransform: "uppercase",
              }}
            >
              Week average
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontFamily: "GeistBold",
                fontSize: 76,
                letterSpacing: -3,
                color: HI,
              }}
            >
              {profile.overall === null ? "—" : profile.overall}
            </div>
            <div style={{ marginTop: 4, fontSize: 22, color: MID }}>{profile.band ?? ""}</div>
          </div>
        </div>

        {/* ── The ten readings ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            backgroundColor: PANEL,
            border: `2px solid ${LINE}`,
            borderRadius: 20,
            padding: "8px 28px",
          }}
        >
          {profile.skills.map((skill, index) => (
            <div
              key={skill.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
                padding: "18px 0",
                borderTop: index === 0 ? "none" : `1px solid ${LINE}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "GeistMono",
                  fontSize: 18,
                  color: FAINT,
                  width: 32,
                  paddingTop: 4,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontFamily: "GeistBold", fontSize: 25, color: HI }}>
                  {skill.name}
                </div>
                <div style={{ marginTop: 4, fontSize: 21, lineHeight: 1.35, color: MID }}>
                  {skill.line}
                </div>
              </div>

              {/* The rail, five marks, same as the screen. */}
              <div style={{ display: "flex", gap: 5, paddingTop: 12 }}>
                {[0, 1, 2, 3, 4].map((step) => {
                  const filled =
                    skill.score !== null && step < Math.max(1, Math.round((skill.score / 100) * 5));
                  return (
                    <div
                      key={step}
                      style={{
                        display: "flex",
                        width: 24,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: filled ? EMBER : "#2A2E35",
                      }}
                    />
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  fontFamily: "GeistMono",
                  fontSize: 26,
                  color: skill.score === null ? FAINT : HI,
                  width: 56,
                  textAlign: "right",
                  paddingTop: 2,
                }}
              >
                {skill.score === null ? "—" : skill.score}
              </div>
            </div>
          ))}
        </div>

        {/* ── Days ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
          {profile.days.map((day) => (
            <div
              key={day.day}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: PANEL,
                border: `2px solid ${LINE}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "GeistMono",
                  fontSize: 17,
                  letterSpacing: 2,
                  color: day.done ? EMBER : FAINT,
                  textTransform: "uppercase",
                }}
              >
                {`Day ${day.day}`}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontFamily: "GeistBold",
                  fontSize: 34,
                  color: day.done ? HI : FAINT,
                }}
              >
                {day.done ? day.score : "—"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 30, fontSize: 20, color: FAINT }}>
          {footer}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "GeistBold", data: bold, weight: 700, style: "normal" },
        { name: "GeistMono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
