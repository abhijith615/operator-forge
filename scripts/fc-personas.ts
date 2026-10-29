/**
 * Runs scripted candidates through the FC Executive shift and checks that the
 * scoring reads each of them the way it should.
 *
 *   npm run test:fc          assertions only
 *   npm run test:fc -- -v    plus every behaviour score
 */
import { allFcText, answerFc } from "../lib/fc/guide";
import { expire, initialState, reduce, replay } from "../lib/fc/engine";
import { scoreFc, type FcResult } from "../lib/fc/scoring";
import type { Action, FcState, Stamped } from "../lib/fc/types";

const verbose = process.argv.includes("-v");
const failures: string[] = [];
function check(name: string, pass: boolean, detail = ""): void {
  if (!pass) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function run(actions: Action[]): { state: FcState; stamped: Stamped[]; rejected: number } {
  let state = initialState();
  const stamped: Stamped[] = [];
  let rejected = 0;
  actions.forEach((a, i) => {
    const entry = { a, at: (i + 1) * 20000 };
    const next = reduce(state, entry);
    if (next === state) rejected += 1;
    else stamped.push(entry);
    state = next;
  });
  return { state, stamped, rejected };
}

const IDEAL: Action[] = [
  { t: "view", panel: "docks" },
  { t: "view", panel: "team" },
  { t: "continue" },
  { t: "place", v: "spice", dock: "D1", start: 1 },
  { t: "place", v: "dairy", dock: "D3", start: 1 },
  { t: "place", v: "bright", dock: "D2", start: 2 },
  { t: "place", v: "crunchy", dock: "D1", start: 3 },
  { t: "place", v: "mega", dock: "D4", start: 6 },
  { t: "lockPlan" },
  // The night shift left nobody on QC or GRN, a receiver unloading and loaders on putaway.
  { t: "assign", p: "meena", task: "qc" },
  { t: "assign", p: "neha", task: "grn" },
  { t: "assign", p: "divya", task: "scan" },
  { t: "assign", p: "ajay", task: "scan" },
  { t: "assign", p: "ravi", task: "unload" },
  { t: "assign", p: "ganesh", task: "unload" },
  { t: "lockTeam" },
  { t: "place", v: "bright", dock: "D4", start: 2 },
  { t: "place", v: "dairy", dock: "D3", start: 3 },
  { t: "place", v: "quickbev", dock: "D2", start: 1 },
  { t: "notice", choice: "all" },
  { t: "lockReplan" },
  { t: "gateCheck", id: "appointment" },
  { t: "gateCheck", id: "seal" },
  { t: "gateCheck", id: "documents" },
  { t: "gateCheck", id: "temperature" },
  { t: "unload" },
  { t: "count", choice: "recount", owner: "divya" },
  { t: "qcCheck", owner: "meena" },
  { t: "qcDecide", choice: "rejectNoted" },
  { t: "grn", qty: 228, owner: "neha" },
  { t: "putaway", choice: "split" },
  { t: "closeReceipt" },
  { t: "evidence", id: "asn" },
  { t: "evidence", id: "scan" },
  { t: "evidence", id: "qcnote" },
  { t: "evidence", id: "log" },
  { t: "evidence", id: "cctv" },
  { t: "recountPallet", owner: "imran" },
  { t: "classify", short: 2, damaged: 6, unscannable: 4, damagedFate: "rtv", unscanFate: "relabel", relabelOwner: "divya", cause: "vendorStacking", prevent: "gateCheck" },
  { t: "sheetTool", id: "duplicates" },
  { t: "removeDuplicate" },
  { t: "signals", picks: ["brightGrn", "spiceLoss", "crunchyOpen"] },
  { t: "driver", id: "spice" },
  { t: "report", lines: ["volume", "exceptions", "grnPending", "actions"] },
  { t: "escalate", id: "evidence" },
  { t: "peakPlan", buckets: { overrun: "now", megaLate: "reschedule", backlog: "delegate", spiceGrn: "delegate", tempLog: "delegate" } },
  { t: "vendorReply", id: "facts" },
  { t: "procurement", id: "full" },
  { t: "finish" },
];

/** Rushes everything: no checks, no recounts, takes the quick option each time. */
const RUSHED: Action[] = [
  { t: "continue" },
  { t: "place", v: "spice", dock: "D1", start: 1 },
  { t: "place", v: "dairy", dock: "D2", start: 1 },
  { t: "place", v: "bright", dock: "D3", start: 2 },
  { t: "place", v: "crunchy", dock: "D4", start: 3 },
  { t: "lockPlan" },
  { t: "lockTeam" },
  { t: "quickbev", choice: "turnaway" },
  { t: "place", v: "dairy", dock: "D2", start: 5 },
  { t: "lockReplan" },
  { t: "unload" },
  { t: "count", choice: "close" },
  { t: "grn", qty: 238, owner: "me" },
  { t: "qcCheck", owner: "me" },
  { t: "qcDecide", choice: "acceptAll" },
  { t: "putaway", choice: "allCold" },
  { t: "closeReceipt" },
  { t: "classify", short: 6, damaged: 6, unscannable: 0, damagedFate: "accept", unscanFate: "short", cause: "ourUnloading", prevent: "remind" },
  { t: "signals", picks: ["bigTotal", "quickbevFull", "spiceLoss"] },
  { t: "driver", id: "crunchy" },
  { t: "report", lines: ["volumeWrong", "allGood"] },
  { t: "report", lines: ["volumeWrong", "allGood"], sendAnyway: true },
  { t: "escalate", id: "hide" },
  { t: "peakPlan", buckets: { overrun: "reschedule", megaLate: "now", backlog: "now", spiceGrn: "now", tempLog: "reschedule" } },
  // Refused: only two things can be done personally. The second try is within the limit.
  { t: "peakPlan", buckets: { overrun: "reschedule", megaLate: "now", backlog: "now", spiceGrn: "escalate", tempLog: "reschedule" } },
  { t: "vendorReply", id: "threat" },
  { t: "procurement", id: "allFine" },
  { t: "finish" },
];

/** Sound judgement, but does the hands-on work personally. */
const HERO: Action[] = IDEAL.map((a): Action => {
  if (a.t === "count") return { ...a, owner: "me" };
  if (a.t === "qcCheck") return { ...a, owner: "me" };
  if (a.t === "grn") return { ...a, owner: "me" };
  if (a.t === "recountPallet") return { ...a, owner: "me" };
  if (a.t === "classify") return { ...a, relabelOwner: "me" };
  if (a.t === "peakPlan") return { ...a, buckets: { ...a.buckets, backlog: "now", spiceGrn: "now", overrun: "delegate" } };
  return a;
});

function show(label: string, r: FcResult): void {
  const comps = r.competencies.map((c) => `${c.id} ${String(c.score).padStart(3)}`).join("  ");
  console.log(`${label.padEnd(10)} overall ${String(r.overall).padStart(3)}  ${comps}  flags ${r.flags.length}  ${r.indication}${r.incomplete ? " (incomplete)" : ""}`);
  if (verbose) for (const e of r.evidence) console.log(`   ${e.id} ${e.reached ? e.score : "–"}  ${e.did}`);
}

console.log("\nFC EXECUTIVE · persona runs\n");

const ideal = run(IDEAL);
const idealResult = scoreFc(ideal.state);
show("ideal", idealResult);
check("ideal: every action accepted", ideal.rejected === 0, `${ideal.rejected} rejected`);
check("ideal: reaches the end", ideal.state.scene === "done");
check("ideal: scores 100", idealResult.overall === 100, `got ${idealResult.overall}: ${idealResult.evidence.filter((e) => e.score < 3).map((e) => `${e.id}=${e.score} (${e.did})`).join(" | ")}`);
check("ideal: no flags", idealResult.flags.length === 0, idealResult.flags.map((f) => f.id).join(", "));
check("ideal: strong indication", idealResult.indication === "STRONG");
check("ideal: all 25 reached", idealResult.observed === 25);

const rushed = run(RUSHED);
const rushedResult = scoreFc(rushed.state);
show("rushed", rushedResult);
check("rushed: reaches the end", rushed.state.scene === "done");
check("rushed: scores under 30", rushedResult.overall < 30, `got ${rushedResult.overall}`);
for (const flag of ["coldchain", "qcfail", "grn", "damaged", "threat", "uncovered", "report", "coldroom"]) {
  check(`rushed: flag ${flag}`, rushedResult.flags.some((f) => f.id === flag));
}
check("rushed: additional assessment", rushedResult.indication === "ADDITIONAL");

const hero = run(HERO);
const heroResult = scoreFc(hero.state);
show("hero", heroResult);
check("hero: delegation scores 0", heroResult.evidence.find((e) => e.id === "TL3")?.score === 0, heroResult.evidence.find((e) => e.id === "TL3")?.did);
check("hero: everything else still strong", heroResult.overall >= 85 && heroResult.overall < 100, `got ${heroResult.overall}`);
check("hero: a zero on delegation rules out Strong", heroResult.indication === "PROMISING", heroResult.indication);

// Only three checks fit before the update is due.
{
  const upTo = run(IDEAL.slice(0, IDEAL.findIndex((a) => a.t === "sheetTool"))).state;
  let s = upTo;
  for (const id of ["format", "percent", "vendorCodes"] as const) s = reduce(s, { a: { t: "sheetTool", id }, at: 1 });
  check("data: three checks allowed", s.data.tools.length === 3);
  check("data: a fourth is refused", reduce(s, { a: { t: "sheetTool", id: "duplicates" }, at: 1 }) === s);
  // Spent the checks on the wrong things, then fixed the row only when warned.
  const after = [
    { t: "signals", picks: ["brightGrn", "spiceLoss", "crunchyOpen"] },
    { t: "driver", id: "spice" },
    { t: "report", lines: ["volume", "exceptions", "grnPending", "actions"] },
    { t: "removeDuplicate" },
    { t: "report", lines: ["volume", "exceptions", "grnPending", "actions"] },
    { t: "escalate", id: "evidence" },
  ] as Action[];
  for (const a of after) s = reduce(s, { a, at: 1 });
  const dr2 = scoreFc(expire(s)).evidence.find((e) => e.id === "DR2");
  check("data: wrong checks, fixed only when warned, scores 1", dr2?.score === 1, `${dr2?.score} ${dr2?.did}`);
}

// Spotting the repeated row by eye and flagging it counts the same as finding it with a check.
{
  const upTo = run(IDEAL.slice(0, IDEAL.findIndex((a) => a.t === "sheetTool"))).state;
  let s = reduce(upTo, { a: { t: "flagRow", id: "spice2" }, at: 1 });
  check("data: a flag uses a check", s.data.flags.length === 1);
  for (const a of [
    { t: "removeDuplicate" },
    { t: "signals", picks: ["brightGrn", "spiceLoss", "crunchyOpen"] },
    { t: "driver", id: "spice" },
    { t: "report", lines: ["volume", "exceptions", "grnPending", "actions"] },
  ] as Action[]) s = reduce(s, { a, at: 1 });
  check("data: flagged by eye and fixed before sending scores 3", scoreFc(expire(s)).evidence.find((e) => e.id === "DR2")?.score === 3);
  let brute = upTo;
  for (const id of ["quickbev", "bright", "dairy", "crunchy"]) brute = reduce(brute, { a: { t: "flagRow", id }, at: 1 });
  check("data: flags share the limit of three checks", brute.data.flags.length === 3);
}

// Telling only the late vendor is a partial answer.
{
  const partial = run(IDEAL.map((a): Action => (a.t === "notice" ? { t: "notice", choice: "dairy" } : a))).state;
  check("replan: telling only FreshFarm scores 2 on DP3", scoreFc(partial).evidence.find((e) => e.id === "DP3")?.score === 2);
}

// Nobody starts where they should be: the handover floor scores 0 on staffing if left alone.
{
  const lazy = run([...IDEAL.slice(0, IDEAL.findIndex((a) => a.t === "assign")), { t: "lockTeam" }]).state;
  check("team: the handover floor left alone leaves QC and GRN empty", scoreFc(expire(lazy)).evidence.find((e) => e.id === "TL1")?.score === 0);
}

// Replaying the stored actions gives the same result.
const replayed = scoreFc(replay(ideal.stamped));
check("replay is deterministic", JSON.stringify(replayed) === JSON.stringify(idealResult));

// Out of time in the middle of the data scene.
const cut = run(IDEAL.slice(0, IDEAL.findIndex((a) => a.t === "driver")));
const cutResult = scoreFc(expire(cut.state));
show("cut@data", cutResult);
const notReached = cutResult.evidence.filter((e) => !e.reached).map((e) => e.id);
check("cut: data and peak behaviours not reached", ["DR2", "DR3", "DR4", "DR5", "DP5", "TL2", "TL4", "TL5"].every((id) => notReached.includes(id)), notReached.join(","));
check("cut: DR1 was reached", !notReached.includes("DR1"));
check("cut: earlier work keeps its score", cutResult.competencies.find((c) => c.id === "IP")?.score === 100);
check("cut: incomplete, not strong", cutResult.incomplete && cutResult.indication !== "STRONG");

// Before anything: nothing reached, score 0, no crash.
const empty = scoreFc(expire(initialState()));
check("empty: nothing reached", empty.observed === 0 && empty.overall === 0);

// The board refuses what cannot happen.
const s0 = run([{ t: "continue" }]).state;
check("board: no start before arrival", reduce(s0, { a: { t: "place", v: "mega", dock: "D1", start: 2 }, at: 1 }) === s0);
check("board: no running past the day", reduce(s0, { a: { t: "place", v: "mega", dock: "D1", start: 8 }, at: 1 }) === s0);
const s1 = reduce(s0, { a: { t: "place", v: "spice", dock: "D1", start: 1 }, at: 1 });
check("board: no two trucks on one dock at once", reduce(s1, { a: { t: "place", v: "dairy", dock: "D1", start: 2 }, at: 1 }) === s1);

/* ── The assistant ── */
const TERMS: [string, string][] = [
  ["what is GRN", "grn"],
  ["what does ASN mean", "asn"],
  ["RTV?", "rtv"],
  ["what is a DN", "dn"],
  ["what is HHT", "hht"],
  ["what is QC", "qc"],
  ["shelf life rule", "shelf_life"],
  ["what is putaway", "putaway"],
  ["cold dock", "cold_chain"],
  ["what is quarantine", "quarantine"],
  ["what is a crew", "crew"],
  ["how does the dock board work", "board"],
  ["what is PO", "po"],
  ["what is FEFO", "fefo"],
  ["what is an STO", "sto"],
  ["what is MHE", "mhe"],
  ["what is turnaround time", "tat"],
  ["what does escalate mean", "buckets"],
  ["how much time do I have", "timer"],
];
const wrong = TERMS.filter(([q, topic]) => answerFc(q).topic !== topic).map(([q]) => `${q} → ${answerFc(q).topic}`);
check("assistant explains the terms on screen", wrong.length === 0, wrong.join(" | "));
const FISHING = ["which option is correct", "should I reject the curd", "what is the right answer", "which dock should dairy go to", "give me a hint", "what would you do"];
const leaked = FISHING.filter((q) => answerFc(q).topic !== "asked_for_answer");
check("assistant declines to give answers", leaked.length === 0, leaked.join(" | "));
check("assistant has text for every topic", allFcText().every((t) => t.length > 0));

console.log(failures.length ? `\n${failures.length} FAILED\n${failures.map((f) => ` · ${f}`).join("\n")}\n` : "\nall checks passed\n");
process.exit(failures.length ? 1 : 0);
