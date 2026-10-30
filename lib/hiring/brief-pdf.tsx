import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Document, Font, Image, Page, Polyline, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { EmployerBrief } from "./brief";

/**
 * The employer's two-page candidate profile, drawn on the server.
 *
 * Page one is the decision: the score, what to do next, the five skill areas,
 * and what the candidate did badly and well. Page two is the interview: what
 * to ask, what a good answer sounds like and what should worry them.
 */

const asset = (...parts: string[]) => join(process.cwd(), ...parts);

let mark: Buffer | null = null;
function markImage() {
  mark ??= readFileSync(asset("assets", "hiring", "mark.png"));
  return { data: mark, format: "png" as const };
}

let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Geist",
    fonts: [
      { src: asset("assets", "fonts", "Geist-Regular.ttf"), fontWeight: 400 },
      { src: asset("assets", "fonts", "Geist-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "GeistMono", src: asset("assets", "fonts", "GeistMono-Medium.ttf") });
  // Whole words only: a split word is harder to read.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const INK = "#0a0a0a";
const YELLOW = "#f5c400";
const PAPER = "#ffffff";
const SOFT = "#f6f5f1";
const LINE = "#e4e2dc";
const BODY = "#2a2a2a";
const MUTED = "#6b6b6b";
const RED = "#c2410c";
const RED_SOFT = "#fdf1ea";
const GREEN = "#0f766e";
const GREEN_SOFT = "#ecf7f5";

const WORD_TONE: Record<string, string> = { Strong: GREEN, Good: "#3f7f3a", "Needs work": "#b7791f", Weak: RED, "Not reached": MUTED };

const s = StyleSheet.create({
  page: { fontFamily: "Geist", fontSize: 9.5, color: BODY, backgroundColor: PAPER, paddingBottom: 40 },
  band: { backgroundColor: INK, paddingHorizontal: 36, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 4, borderBottomColor: YELLOW },
  bandTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 18, height: 20, marginRight: 8 },
  brandText: { fontFamily: "GeistMono", fontSize: 9.5, letterSpacing: 2.4, color: PAPER },
  kicker: { fontFamily: "GeistMono", fontSize: 7.5, letterSpacing: 1.6, color: YELLOW, textAlign: "right" },
  name: { marginTop: 12, fontSize: 22, fontWeight: 700, color: PAPER, letterSpacing: -0.6 },
  sub: { marginTop: 4, fontSize: 10, color: "#c9c9c9" },
  body: { paddingHorizontal: 36, paddingTop: 14 },
  label: { fontFamily: "GeistMono", fontSize: 7.5, letterSpacing: 1.6, color: MUTED, marginBottom: 6 },
  row: { flexDirection: "row" },
  scoreCard: { width: 130, backgroundColor: INK, borderRadius: 8, padding: 12, marginRight: 12 },
  scoreNum: { fontSize: 38, fontWeight: 700, color: YELLOW, letterSpacing: -1.5 },
  scoreOf: { fontFamily: "GeistMono", fontSize: 7.5, color: "#bdbdbd", letterSpacing: 1.2, marginTop: 2 },
  recCard: { flex: 1, backgroundColor: "#fff8d6", borderRadius: 8, borderWidth: 1, borderColor: "#f1dd7a", padding: 12 },
  recLabel: { fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 },
  recText: { fontSize: 10, lineHeight: 1.45, color: BODY },
  note: { marginTop: 8, fontSize: 8.5, color: MUTED, lineHeight: 1.4 },
  about: { marginTop: 10, backgroundColor: SOFT, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12, fontSize: 8.8, lineHeight: 1.45, color: BODY },
  section: { marginTop: 12 },
  skill: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  skillName: { width: 124, fontSize: 9.8, fontWeight: 700, color: INK },
  skillAbout: { flex: 1, fontSize: 8.2, color: MUTED, paddingRight: 8 },
  barTrack: { width: 60, height: 5, borderRadius: 3, backgroundColor: LINE, marginRight: 8 },
  skillScore: { width: 22, fontSize: 10, fontWeight: 700, color: INK, textAlign: "right", marginRight: 8 },
  skillWord: { width: 54, fontSize: 8.6, fontWeight: 700 },
  item: { flexDirection: "row", marginBottom: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", marginRight: 7, marginTop: 0.5 },
  dotText: { fontSize: 8, fontWeight: 700, color: PAPER },
  itemArea: { fontSize: 9.4, fontWeight: 700, color: INK },
  itemText: { fontSize: 8.8, lineHeight: 1.4, color: BODY, marginTop: 1 },
  flagBox: { marginTop: 6, borderRadius: 6, borderWidth: 1, borderColor: "#f3c2a6", backgroundColor: RED_SOFT, padding: 8 },
  flagTitle: { fontSize: 9.6, fontWeight: 700, color: RED, marginBottom: 4 },
  flagLine: { fontSize: 8.8, color: BODY, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontFamily: "GeistMono", fontSize: 7, color: MUTED, letterSpacing: 0.6 },
  probe: { borderWidth: 1, borderColor: LINE, borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  probeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: SOFT, paddingHorizontal: 12, paddingVertical: 5 },
  probeNum: { fontFamily: "GeistMono", fontSize: 7.5, color: MUTED, letterSpacing: 1.2 },
  probeArea: { fontSize: 10.5, fontWeight: 700, color: INK },
  probeBody: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 7 },
  seen: { fontSize: 8.8, lineHeight: 1.4, color: BODY },
  seenLabel: { fontWeight: 700, color: RED },
  ask: { marginTop: 5, borderLeftWidth: 3, borderLeftColor: YELLOW, paddingLeft: 9, fontSize: 10.2, fontWeight: 700, lineHeight: 1.4, color: INK },
  listenRow: { flexDirection: "row", marginTop: 6 },
  listenCol: { flex: 1, borderRadius: 5, padding: 6 },
  listenLabel: { fontFamily: "GeistMono", fontSize: 7, letterSpacing: 1.2, marginBottom: 3 },
  listenText: { fontSize: 8.6, lineHeight: 1.4, color: BODY },
  howBox: { marginTop: 2, backgroundColor: INK, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  howTitle: { fontWeight: 700, color: YELLOW },
  howText: { fontSize: 8.4, lineHeight: 1.45, color: "#e2e2e2" },
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

function Bar({ score, tone }: { score: number; tone: string }) {
  return (
    <View style={s.barTrack}>
      <View style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: 5, borderRadius: 3, backgroundColor: tone }} />
    </View>
  );
}

function Footer({ brief, page }: { brief: EmployerBrief; page: number }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {brief.sample ? "Sample profile · simulated candidate" : "Confidential · for hiring use only"} · scored by fixed rules, no AI
      </Text>
      <Text style={s.footerText}>operatorforge.in/hiring-test · {page} / 2</Text>
    </View>
  );
}

function Band({ brief, title, sub, compact = false }: { brief: EmployerBrief; title: string; sub: string; compact?: boolean }) {
  return (
    <View style={s.band}>
      <View style={s.bandTop}>
        <View style={s.brand}>
          {/* A PDF image, not an HTML one: it takes no alt text. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={markImage()} style={s.mark} />
          <Text style={s.brandText}>OPERATOR FORGE</Text>
        </View>
        <View>
          <Text style={s.kicker}>HIRING TEST · CANDIDATE PROFILE</Text>
          {brief.sample ? <Text style={[s.kicker, { color: "#bdbdbd", marginTop: 3 }]}>SAMPLE · SIMULATED CANDIDATE</Text> : null}
        </View>
      </View>
      <Text style={compact ? [s.name, { marginTop: 10, fontSize: 18 }] : s.name}>{title}</Text>
      <Text style={s.sub}>{sub}</Text>
    </View>
  );
}

function BriefDocument({ brief }: { brief: EmployerBrief }) {
  const date = formatDate(brief.date);
  // No role: the same test is used for Assistant Store Manager and Store Manager hires.
  const sub = [date ? `Test taken ${date}` : null, brief.workSample ?? "Dark store manager work sample"].filter(Boolean).join("  ·  ");
  // Page one has to hold the serious concerns too; the lists give way to them.
  // The concerns are weaknesses themselves, and page two still covers the top four.
  const weakShown = brief.flags.length > 3 ? 3 : brief.flags.length ? 4 : 5;
  const strongShown = brief.flags.length > 3 ? 3 : 4;
  const coverage = brief.completed
    ? `Finished the whole test (${brief.reached.observed} of ${brief.reached.total} decision points).`
    : `Ran out of time: reached ${brief.reached.observed} of ${brief.reached.total} decision points. Those not reached count as zero in the score${brief.reachedOverall !== undefined ? `; on those reached, they scored ${brief.reachedOverall}` : ""}.`;

  return (
    <Document title={`Candidate profile — ${brief.candidate}`} author="Operator Forge" subject="Hiring Test candidate profile">
      {/* ── Page 1: the decision ─────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Band brief={brief} title={brief.candidate} sub={sub} />
        <View style={s.body}>
          <View style={s.row}>
            <View style={s.scoreCard}>
              <Text style={[s.label, { color: "#bdbdbd" }]}>OVERALL SCORE</Text>
              <Text style={s.scoreNum}>{brief.overall}</Text>
              <Text style={s.scoreOf}>OUT OF 100</Text>
            </View>
            <View style={s.recCard}>
              <Text style={[s.label, { color: "#8a6d00" }]}>OUR SUGGESTION</Text>
              <Text style={s.recLabel}>{brief.recommendation.label}</Text>
              <Text style={s.recText}>{brief.recommendation.text}</Text>
              <Text style={s.note}>{coverage}</Text>
            </View>
          </View>

          <Text style={s.about}>
            {brief.about ??
              "The candidate ran a dark store through one busy morning in a 30-minute simulation, making the decisions a store manager makes every day — staff, stock, delays and customers. This report says what they did, in everyday store terms."}
          </Text>

          <View style={s.section}>
            <Text style={s.label}>FIVE SKILL AREAS</Text>
            {brief.skills.map((skill) => {
              const tone = WORD_TONE[skill.word] ?? MUTED;
              return (
                <View key={skill.name} style={s.skill} wrap={false}>
                  <Text style={s.skillName}>{skill.name}</Text>
                  <Text style={s.skillAbout}>{skill.about}</Text>
                  <Bar score={skill.reached ? skill.score : 0} tone={tone} />
                  <Text style={s.skillScore}>{skill.reached ? skill.score : "—"}</Text>
                  <Text style={[s.skillWord, { color: tone }]}>{skill.word}</Text>
                </View>
              );
            })}
          </View>

          <View style={[s.section, s.row]}>
            <View style={{ flex: 1.15, marginRight: 16 }}>
              <Text style={[s.label, { color: RED }]}>WEAKNESSES WE SAW</Text>
              {brief.weaknesses.length ? (
                brief.weaknesses.slice(0, weakShown).map((item) => (
                  <View key={item.area} style={s.item} wrap={false}>
                    <View style={[s.dot, { backgroundColor: RED }]}>
                      <Text style={s.dotText}>!</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemArea}>{item.area}</Text>
                      <Text style={s.itemText}>{item.text}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.itemText}>No clear weakness in the decisions they reached.</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: GREEN }]}>WHAT THEY DID WELL</Text>
              {brief.strengths.length ? (
                brief.strengths.slice(0, strongShown).map((item) => (
                  <View key={item.area} style={s.item} wrap={false}>
                    <View style={[s.dot, { backgroundColor: GREEN }]}>
                      {/* Drawn, not typed: the font has no tick. */}
                      <Svg width={8} height={8} viewBox="0 0 10 10">
                        <Polyline points="1.5,5.4 4,7.8 8.6,2.4" stroke={PAPER} strokeWidth={1.8} fill="none" />
                      </Svg>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemArea}>{item.area}</Text>
                      <Text style={s.itemText}>{item.text}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.itemText}>No area was handled fully well.</Text>
              )}
            </View>
          </View>

          {brief.flags.length ? (
            <View style={s.flagBox} wrap={false}>
              <Text style={s.flagTitle}>
                {brief.flags.length === 1 ? "One serious concern" : `${brief.flags.length} serious concerns`} — please discuss in the interview
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {brief.flags.map((flag) => (
                  <Text key={flag} style={[s.flagLine, { width: "100%" }]}>
                    •  {flag}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
        <Footer brief={brief} page={1} />
      </Page>

      {/* ── Page 2: the interview ────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Band compact brief={brief} title="What to ask in the interview" sub={`${brief.candidate}  ·  Score ${brief.overall} / 100  ·  ${brief.recommendation.label}`} />
        <View style={s.body}>
          <Text style={[s.recText, { marginBottom: 10 }]}>
            These questions come from where this candidate was weakest in the test. Ask for a real example from their own
            work, then compare the answer with the two boxes under each question.
          </Text>
          {brief.probes.map((probe, index) => (
            <View key={probe.area} style={s.probe} wrap={false}>
              <View style={s.probeHead}>
                <Text style={s.probeArea}>{probe.area}</Text>
                <Text style={s.probeNum}>QUESTION {index + 1}</Text>
              </View>
              <View style={s.probeBody}>
                <Text style={s.seen}>
                  <Text style={s.seenLabel}>What we saw: </Text>
                  {probe.text}
                </Text>
                <Text style={s.ask}>“{probe.ask}”</Text>
                <View style={s.listenRow}>
                  <View style={[s.listenCol, { backgroundColor: GREEN_SOFT, marginRight: 8 }]}>
                    <Text style={[s.listenLabel, { color: GREEN }]}>A GOOD ANSWER</Text>
                    <Text style={s.listenText}>{probe.listen}</Text>
                  </View>
                  <View style={[s.listenCol, { backgroundColor: RED_SOFT }]}>
                    <Text style={[s.listenLabel, { color: RED }]}>BE CAREFUL IF</Text>
                    <Text style={s.listenText}>{probe.careful}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          <View style={s.howBox} wrap={false}>
            <Text style={s.howText}>
              <Text style={s.howTitle}>How to use this report  </Text>
              Use it with your interview and reference checks: it is one input, not a final decision. Never reject a
              candidate on this score alone — a weakness is a topic to discuss, and many can be trained. Every score
              comes from fixed rules applied to what the candidate did; no AI judged them.
            </Text>
          </View>
        </View>
        <Footer brief={brief} page={2} />
      </Page>
    </Document>
  );
}

export async function renderBriefPdf(brief: EmployerBrief): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<BriefDocument brief={brief} />);
}

/** "Candidate-Profile-Anita-Nair.pdf" — letters, digits and hyphens only. */
export function briefFileName(candidate: string): string {
  const base = candidate.split("@")[0]!.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 60);
  return `Candidate-Profile-${base || "Candidate"}.pdf`;
}
