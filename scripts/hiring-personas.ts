/**
 * Runs the seven test managers through all three forms and checks that the
 * instrument reads each of them the way it should.
 *
 *   npm run test:hiring            assertions only
 *   npm run test:hiring -- -v      plus every behaviour score
 */
import { expire, replay } from "../lib/hiring/engine";
import { clockLabel, outputOf } from "../lib/hiring/model";
import { PERSONAS, sitShift, type PersonaId, type Style } from "../lib/hiring/personas";
import { scoreAssessment, type AssessmentResult } from "../lib/hiring/scoring";
import type { FormId, HiringState } from "../lib/hiring/types";
import { COMPETENCIES, assessmentWeights } from "../lib/hiring/weights";

const verbose = process.argv.includes("-v");
const FORMS: FormId[] = ["A", "B", "C"];
const failures: string[] = [];

function check(name: string, pass: boolean, detail = ""): void {
  if (!pass) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  if (verbose || !pass) console.log(`${pass ? "  ok  " : "  FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
}

const pad = (value: string | number, width: number) => String(value).padEnd(width);
const score = (result: AssessmentResult, id: string) => result.evidence.find((e) => e.behaviourId === id)!.score;
const comp = (result: AssessmentResult, id: (typeof COMPETENCIES)[number]) =>
  result.competencies.find((c) => c.id === id)!.score;

function run(form: FormId, style: Style): { state: HiringState; result: AssessmentResult; actions: number } {
  const { actions, state } = sitShift(form, style);
  return { state, result: scoreAssessment(state), actions: actions.length };
}

/* ── One shift, in detail:  --trace balancedLeader A ──────────────────── */

const traceAt = process.argv.indexOf("--trace");
if (traceAt > -1) {
  const id = process.argv[traceAt + 1] as PersonaId;
  const form = (process.argv[traceAt + 2] ?? "A") as FormId;
  const { state, result } = run(form, PERSONAS[id]);
  console.log(`\n${PERSONAS[id].label} · form ${form} · ${result.overall}\n`);
  console.log("arrivals  " + Object.entries(state.arrivals).map(([scene, at]) => `${scene} ${clockLabel(at!)}`).join(" · "));
  console.log("floor     " + Object.entries(state.assign).map(([emp, station]) => `${emp}:${station.slice(0, 4)}`).join(" "));
  console.log("projected " + JSON.stringify(state.floor?.projected, (_, v) => (typeof v === "number" ? Math.round(v * 100) : v)) + ` reserve ${state.floor?.reserve.join(",")}`);
  console.log("\nactions");
  for (const entry of state.log) {
    const c = entry.after.coverage;
    console.log(
      `  ${clockLabel(entry.simTime)}→${clockLabel(entry.simAfter)} ${pad(entry.scene, 11)} ${pad(entry.eventType + (entry.entityId ? `:${entry.entityId}` : ""), 26)}` +
        ` ctd ${pad(entry.after.ctd, 4)} wait ${pad(entry.after.ordersWaiting, 3)} packQ ${pad(entry.after.packingQueue, 3)}` +
        ` pick ${pad(Math.round(c.picking * 100), 4)} pack ${pad(Math.round(c.packing * 100), 4)} disp ${pad(Math.round(c.dispatch * 100), 4)} shelf ${Math.round(c.replenishment * 100)}`,
    );
  }
  console.log("\ntrace     " + state.trace.filter((_, i) => i % 3 === 2).map((p) => `${clockLabel(p.t)} ${p.ctd}`).join(" · "));
  console.log("\ndelegated " + state.delegations.map((d) => `${d.label}→${d.owner}(${d.fit}${d.appropriate ? "" : " ✗"})`).join(" · "));
  console.log("personal  " + state.personal.map((p) => `${p.label}${p.delegable && p.fitAvailable ? " ✗" : ""}`).join(" · "));
  console.log("tasks     " + state.tasksOffered.map((t) => `${t.id}${t.urgent ? "!" : ""}=${state.plan?.[t.id]?.bucket}${state.plan?.[t.id]?.owner ? `:${state.plan[t.id]!.owner}` : ""}`).join(" · "));
  console.log("outcome   " + state.outcome?.title + " · " + state.outcome?.events.map((e) => `${clockLabel(e.clock)} ${e.text}`).join(" | "));
  console.log("\nevidence");
  for (const e of result.evidence) console.log(`  ${pad(e.behaviourId, 4)} ${e.score}  ${e.title}`);
  process.exit(0);
}

/* ── The table ────────────────────────────────────────────────────────── */

console.log("\nHIRING TEST · persona runs\n");
console.log(
  pad("persona", 24) + pad("form", 5) + pad("all", 5) + pad("team", 6) + pad("inv", 5) + pad("time", 6) + pad("crit", 6) +
    pad("cust", 6) + pad("maxCTD", 8) + pad("endCTD", 8) + pad("ends", 7) + pad("flags", 6) + "outcome · indication · signature",
);

const results = {} as Record<PersonaId, Record<FormId, ReturnType<typeof run>>>;
for (const id of Object.keys(PERSONAS) as PersonaId[]) {
  results[id] = {} as Record<FormId, ReturnType<typeof run>>;
  for (const form of FORMS) {
    const out = run(form, PERSONAS[id]);
    results[id][form] = out;
    const r = out.result;
    const finalAt = out.state.arrivals.final ?? 0;
    console.log(
      pad(PERSONAS[id].label, 24) + pad(form, 5) + pad(r.overall, 5) + pad(comp(r, "teamManagement"), 6) +
        pad(comp(r, "inventoryManagement"), 5) + pad(comp(r, "timePrioritisation"), 6) + pad(comp(r, "criticalThinking"), 6) +
        pad(comp(r, "customerFirst"), 6) + pad(r.stats.maxCtd, 8) + pad(r.stats.finalCtd ?? "-", 8) + pad(clockLabel(finalAt), 7) +
        pad(r.flags.length, 6) + `${r.outcomeTitle} · ${r.indication.split(" — ")[0]} · ${r.signature.name}`,
    );
    if (verbose) {
      console.log("    " + r.evidence.map((e) => `${e.behaviourId}:${e.score}`).join(" "));
      console.log("    team " + r.teamSubscores.map((s) => `${s.label.split(" ")[0]}=${s.score}`).join(" ") +
        ` · trust ${r.stats.trust} · delegated ${r.stats.delegatedWell}/${r.stats.delegated} · personal ${r.stats.personalDelegable}`);
      if (r.flags.length) console.log("    flags: " + r.flags.map((f) => f.id).join(", "));
    }
  }
}

/* ── What each persona must look like ─────────────────────────────────── */

console.log("\nchecks\n");

check("weights are exactly 30 / 25 / 20 / 15 / 10",
  assessmentWeights.teamManagement === 0.3 && assessmentWeights.inventoryManagement === 0.25 &&
    assessmentWeights.timePrioritisation === 0.2 && assessmentWeights.criticalThinking === 0.15 &&
    assessmentWeights.customerFirst === 0.1);

const sample = results.balancedLeader.A.result;
const perCompetency = Object.fromEntries(COMPETENCIES.map((id) => [id, sample.evidence.filter((e) => e.competencyId === id).length]));
check("evidence opportunities: 10 / 8 / 6 / 6 / 4",
  perCompetency.teamManagement === 10 && perCompetency.inventoryManagement === 8 && perCompetency.timePrioritisation === 6 &&
    perCompetency.criticalThinking === 6 && perCompetency.customerFirst === 4, JSON.stringify(perCompetency));
check("no single behaviour is more than a fifth of its competency",
  COMPETENCIES.every((id) => 1 / perCompetency[id]! <= 0.25));

for (const form of FORMS) {
  const tag = (name: string) => `[${form}] ${name}`;
  const of = (id: PersonaId) => results[id][form];
  const balanced = of("balancedLeader").result;
  const strong = of("strongAsm").result;
  const hero = of("individualHero").result;
  const command = of("commandControl").result;
  const fast = of("fastReactor").result;
  const analyser = of("overAnalyser").result;
  const sla = of("slaFirst").result;
  const everyone = (Object.keys(PERSONAS) as PersonaId[]).map((id) => of(id).result);

  // Deterministic, and the same on the server as in the browser.
  const again = sitShift(form, PERSONAS.balancedLeader);
  const replayed = scoreAssessment(replay(form, again.actions));
  check(tag("replaying the same actions gives the same result"), JSON.stringify(replayed) === JSON.stringify(balanced));

  check(tag("balanced leader is the strongest profile"), everyone.every((r) => r.overall <= balanced.overall), `${balanced.overall}`);
  check(tag("balanced leader ≥ 85, no flags, proceeds to interview"),
    balanced.overall >= 85 && balanced.flags.length === 0 && balanced.indication.startsWith("STRONG"), `${balanced.overall} · ${balanced.indication}`);
  check(tag("balanced leader brings the peak under control"), balanced.outcomeTitle === "PEAK UNDER CONTROL", `${balanced.outcomeTitle} max ${balanced.stats.maxCtd} end ${balanced.stats.finalCtd}`);
  check(tag("balanced leader reaches the final call on schedule"), (of("balancedLeader").state.arrivals.final ?? 9999) <= 1920 + 60);

  check(tag("strong ASM ≥ 75, no flags, proceeds to interview"),
    strong.overall >= 75 && strong.flags.length === 0 && strong.indication.startsWith("STRONG"), `${strong.overall} · ${strong.indication}`);

  check(tag("hero: reasonable operating score"), hero.overall >= 50 && comp(hero, "inventoryManagement") >= 60, `${hero.overall} inv ${comp(hero, "inventoryManagement")}`);
  check(tag("hero: weaker delegation than the balanced leader"), score(hero, "T9") <= 1 && score(hero, "T9") < score(balanced, "T9"), `T9 ${score(hero, "T9")}`);
  check(tag("hero: high manager dependency"), hero.teamSubscores.find((s) => s.id === "dependency")!.note === "High" && score(hero, "T10") === 0, `personal ${hero.stats.personalDelegable}`);
  check(tag("hero: signature names it"), hero.signature.name === "STRONG OPERATOR · WEAK DELEGATOR", hero.signature.name);
  check(tag("hero scores below the balanced leader by a clear margin"), hero.overall <= balanced.overall - 12, `${hero.overall} vs ${balanced.overall}`);

  check(tag("command-and-control: weak Team Management"), comp(command, "teamManagement") < 50, `${comp(command, "teamManagement")}`);
  check(tag("command-and-control: Team is the lowest competency"), command.competencies.every((c) => c.score >= comp(command, "teamManagement")));
  check(tag("command-and-control: trust fell"), command.stats.trust < 50, `${command.stats.trust}`);

  check(tag("fast reactor: weak Inventory"), comp(fast, "inventoryManagement") < 45, `${comp(fast, "inventoryManagement")}`);
  check(tag("fast reactor: weak Critical Thinking"), comp(fast, "criticalThinking") < 45, `${comp(fast, "criticalThinking")}`);
  check(tag("fast reactor: flagged for manual review"), fast.flags.length >= 2, fast.flags.map((f) => f.id).join(","));

  check(tag("over-analyser: good evidence discipline"), comp(analyser, "inventoryManagement") >= 70 && score(analyser, "C1") === 3, `inv ${comp(analyser, "inventoryManagement")}`);
  check(tag("over-analyser: weak priority"), comp(analyser, "timePrioritisation") < 55, `${comp(analyser, "timePrioritisation")}`);
  check(tag("over-analyser: unfocused investigation is recorded"), score(analyser, "C6") <= 1, `C6 ${score(analyser, "C6")}`);
  check(tag("over-analyser: time is the lowest competency"), analyser.competencies.every((c) => c.score >= comp(analyser, "timePrioritisation")));

  check(tag("SLA-first: customer risk"), comp(sla, "customerFirst") < 40, `${comp(sla, "customerFirst")}`);
  check(tag("SLA-first: control risk flagged"), sla.flags.some((f) => f.id === "segregation") && sla.flags.length >= 2, sla.flags.map((f) => f.id).join(","));
  check(tag("SLA-first: not waved through"), !sla.indication.startsWith("STRONG"), sla.indication);

  check(tag("nobody is auto-rejected"), everyone.every((r) => !/reject/i.test(r.indication)));
  check(tag("every score traces to evidence"),
    everyone.every((r) => r.evidence.every((e) => e.title && e.stateBefore && e.candidateAction && e.stateAfter && e.timingContext)));
}

/* ── Causality: one decision changed, and what it does later ──────────── */

console.log("\ncausality\n");

const base = PERSONAS.balancedLeader;
for (const form of FORMS) {
  const tag = (name: string) => `[${form}] ${name}`;
  const good = run(form, base);

  const riyaRemoved = run(form, { ...base, riya: { inspect: false, choices: ["removePicking"] } });
  check(tag("Riya removed → picking is weaker when the three problems land"),
    riyaRemoved.state.triageAt!.coverage.picking < good.state.triageAt!.coverage.picking - 0.05 && riyaRemoved.state.outcome!.riyaOutput === 0,
    `${riyaRemoved.state.triageAt!.coverage.picking.toFixed(2)} vs ${good.state.triageAt!.coverage.picking.toFixed(2)}`);

  const arjunThreat = run(form, { ...base, arjun: { check: [], place: "here", ack: "dismiss", clarify: "deflect", request: "threat" } });
  const arjunNone = run(form, { ...base, arjun: { ...base.arjun, request: "none" } });
  check(tag("Arjun not asked → he leaves at 18:00 and the peak is harder"),
    arjunNone.state.arjun.outcome === "leaving" && arjunNone.result.stats.finalCtd! >= good.result.stats.finalCtd! &&
      arjunNone.state.outcome!.pickingAtPeak < good.state.outcome!.pickingAtPeak,
    `${arjunNone.state.arjun.outcome} end ${arjunNone.result.stats.finalCtd} vs ${good.result.stats.finalCtd}`);
  check(tag("Arjun threatened → resentful, trust falls"),
    arjunThreat.state.arjun.outcome === "resentful" && arjunThreat.result.stats.trust < good.result.stats.trust - 15,
    `${arjunThreat.state.arjun.outcome} trust ${arjunThreat.result.stats.trust} vs ${good.result.stats.trust}`);

  const farhanSelf = run(form, { ...base, kase: { ...base.kase, countBy: "me" } });
  const farhanWrong = run(form, { ...base, kase: { ...base.kase, countBy: "rahul" } });
  check(tag("count by Farhan finishes sooner than by the wrong person"),
    good.state.kase.countDoneAt! < farhanWrong.state.kase.countDoneAt!,
    `${clockLabel(good.state.kase.countDoneAt!)} vs ${clockLabel(farhanWrong.state.kase.countDoneAt!)}`);
  check(tag("count done personally raises manager dependency"),
    farhanSelf.result.stats.personalDelegable > good.result.stats.personalDelegable);

  const keepFloor = run(form, { ...base, floor: "keep", absence: ["short"] });
  check(tag("an unbalanced floor meets a worse surge"),
    keepFloor.state.triageAt!.ctd > good.state.triageAt!.ctd && keepFloor.result.stats.maxCtd > good.result.stats.maxCtd,
    `triage CTD ${keepFloor.state.triageAt!.ctd} vs ${good.state.triageAt!.ctd}; max ${keepFloor.result.stats.maxCtd} vs ${good.result.stats.maxCtd}`);

  // The same floor, left alone all evening.
  const neglected = run(form, {
    ...base,
    floor: "keep",
    absence: ["short"],
    triage: { constraint: "later", aisle: "later", followUp: "later" },
    bottleneck: { ...base.bottleneck, fix: "none" },
  });
  check(tag("different teams, different open tasks at the final call"),
    neglected.state.tasksOffered.map((t) => t.id).join() !== good.state.tasksOffered.map((t) => t.id).join(),
    neglected.state.tasksOffered.map((t) => t.id).join());
  check(tag("the bag is harder to fix on a floor that was left alone"),
    neglected.state.bag!.ctdBefore > good.state.bag!.ctdBefore &&
      neglected.state.bag!.ctdAfter - neglected.state.bag!.ctdBefore >= good.state.bag!.ctdAfter - good.state.bag!.ctdBefore,
    `${neglected.state.bag!.ctdBefore}→${neglected.state.bag!.ctdAfter} vs ${good.state.bag!.ctdBefore}→${good.state.bag!.ctdAfter}`);
  check(tag("a neglected floor ends the evening under pressure"), neglected.result.outcomeTitle === "STORE UNDER PRESSURE", neglected.result.outcomeTitle);

  // The same move, made with a different team behind it.
  check(tag("Arjun covers a second station as well as he was treated"),
    outputOf(arjunThreat.state, "arjun", "packing") < outputOf(good.state, "arjun", "packing") - 0.2,
    `${outputOf(arjunThreat.state, "arjun", "packing").toFixed(2)} vs ${outputOf(good.state, "arjun", "packing").toFixed(2)}`);

  const noCover = run(form, { ...base, absence: ["short"] });
  check(tag("no cover booked → no reserve, and a harder evening"),
    noCover.state.floor!.reserve.length < good.state.floor!.reserve.length && noCover.result.stats.maxCtd > good.result.stats.maxCtd,
    `reserve ${noCover.state.floor!.reserve.length} vs ${good.state.floor!.reserve.length}; max ${noCover.result.stats.maxCtd} vs ${good.result.stats.maxCtd}`);

  check(tag("cross-scenario evidence is produced"), good.result.crossScenario.length >= 3 && riyaRemoved.result.crossScenario.length >= 3,
    `${good.result.crossScenario.length}`);
  check(tag("interview probes come from the evidence"), neglected.result.probes.length >= 3 && neglected.result.probes.every((p) => p.evidence.length > 20));
}

/* ── Running out of time ──────────────────────────────────────────────── */

for (const form of FORMS) {
  const { actions } = sitShift(form, base);
  const partial = replay(form, actions.slice(0, Math.floor(actions.length / 2)));
  const timedOut = scoreAssessment(expire(partial));
  const full = results.balancedLeader[form].result;
  check(`[${form}] time expiring mid-shift keeps the evidence so far and still produces a result`,
    timedOut.overall > 0 && timedOut.overall < full.overall && timedOut.evidence.some((e) => e.behaviourTags.includes("not_reached")) &&
      timedOut.evidence.filter((e) => e.score === 3).length >= 5,
    `${timedOut.overall}`);
}

console.log(failures.length ? `\n${failures.length} FAILED\n` : "\nall checks passed\n");
process.exit(failures.length ? 1 : 0);
