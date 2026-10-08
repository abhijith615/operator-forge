import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import type { OperatorProfile } from "@/lib/challenge/day-six/profile";

/**
 * The Operator Profile as a PNG.
 *
 * Portrait, at a size that stays legible attached to an application or pasted
 * into a message thread — the two places this actually ends up. It carries the
 * evidence lines, not only the scores, because the whole point of the page is
 * that a number without them is unreadable to anybody who was not there.
 *
 * Satori has no cascade and no block layout, so every div sets its own
 * display explicitly. That is not a style choice; leaving one out throws.
 */

const WIDTH = 1240;
const HEIGHT = 1930;

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

  const subtitle = `Operator Profile · ${profile.daysDone} of 5 simulations completed`;
  const footer = `Built from ${profile.decisionsTaken} recorded decisions across five simulated shifts. operatorforge.in`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: WIDTH,
          height: HEIGHT,
          flexDirection: "column",
          backgroundColor: INK,
          padding: 56,
          fontFamily: "Geist",
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "GeistMono",
              fontSize: 20,
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
              marginTop: 14,
              fontFamily: "GeistBold",
              fontSize: 58,
              letterSpacing: -2,
              color: HI,
            }}
          >
            {fullName}
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 23, color: MID }}>{subtitle}</div>
        </div>

        {/* ── Signature and score ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 2,
              backgroundColor: "#1A1710",
              border: `2px solid ${EMBER}55`,
              borderRadius: 18,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "GeistMono",
                fontSize: 16,
                letterSpacing: 3,
                color: EMBER,
                textTransform: "uppercase",
              }}
            >
              Operator signature
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontFamily: "GeistBold",
                fontSize: 34,
                color: HI,
              }}
            >
              {profile.signature.name}
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 21, color: MID }}>
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
              borderRadius: 18,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "GeistMono",
                fontSize: 16,
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
                marginTop: 8,
                fontFamily: "GeistBold",
                fontSize: 64,
                letterSpacing: -3,
                color: HI,
              }}
            >
              {profile.overall === null ? "—" : String(profile.overall)}
            </div>
            <div style={{ display: "flex", marginTop: 2, fontSize: 20, color: MID }}>
              {profile.band ?? ""}
            </div>
          </div>
        </div>

        {/* ── The five, with their evidence ────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 11 }}>
          {profile.main.map((skill, index) => (
            <div
              key={skill.dimension}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: PANEL,
                border: `2px solid ${LINE}`,
                borderRadius: 16,
                padding: "16px 22px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "GeistMono",
                    fontSize: 16,
                    color: FAINT,
                    width: 28,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontFamily: "GeistBold",
                    fontSize: 25,
                    color: HI,
                  }}
                >
                  {skill.name}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[0, 1, 2, 3, 4].map((step) => {
                    const filled =
                      skill.score !== null &&
                      step < Math.max(1, Math.round((skill.score / 100) * 5));
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
                    fontFamily: "GeistBold",
                    fontSize: 30,
                    color: skill.score === null ? FAINT : HI,
                    width: 62,
                    justifyContent: "flex-end",
                  }}
                >
                  {skill.score === null ? "—" : String(skill.score)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 12,
                  paddingTop: 11,
                  borderTop: `1px solid ${LINE}`,
                  gap: 5,
                }}
              >
                {skill.evidence.map((line, lineIndex) => (
                  <div key={lineIndex} style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        marginTop: 9,
                        backgroundColor:
                          lineIndex === skill.evidence.length - 1 ? EMBER : "#3A3F47",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flex: 1,
                        fontSize: 18,
                        lineHeight: 1.4,
                        color: lineIndex === skill.evidence.length - 1 ? HI : MID,
                      }}
                    >
                      {line}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Also observed ────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 11, marginTop: 22 }}>
          {profile.subset.map((skill) => (
            <div
              key={skill.id}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: PANEL,
                border: `2px solid ${LINE}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontFamily: "GeistBold",
                    fontSize: 19,
                    color: HI,
                  }}
                >
                  {skill.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "GeistBold",
                    fontSize: 23,
                    color: skill.score === null ? FAINT : EMBER,
                  }}
                >
                  {skill.score === null ? "—" : String(skill.score)}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  fontSize: 16,
                  lineHeight: 1.35,
                  color: MID,
                }}
              >
                {skill.line}
              </div>
            </div>
          ))}
        </div>

        {/* ── Days ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          {profile.days.map((day) => (
            <div
              key={day.day}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: PANEL,
                border: `2px solid ${LINE}`,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "GeistMono",
                  fontSize: 15,
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
                  marginTop: 6,
                  fontFamily: "GeistBold",
                  fontSize: 29,
                  color: day.done ? HI : FAINT,
                }}
              >
                {day.done ? String(day.score) : "—"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: 20, fontSize: 18, color: FAINT }}>{footer}</div>
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
