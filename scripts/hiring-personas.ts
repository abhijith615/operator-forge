/**
 * Runs the seven test managers through all three forms and checks that the
 * instrument reads each of them the way it should.
 *
 *   npm run test:hiring            assertions only
 *   npm run test:hiring -- -v      plus every behaviour score
 */
import { allBriefText, buildEmployerBrief } from "../lib/hiring/brief";
import { paceOf } from "../lib/hiring/content";
import { FORMS as FORM_CONTENT } from "../lib/hiring/forms";
import { ROSTER } from "../lib/hiring/roster";
import { expire, replay } from "../lib/hiring/engine";
import { allSuggestions, answer } from "../lib/hiring/guide";
import { clockLabel, forecastParts, outputOf, projectedPeak } from "../lib/hiring/model";
import { PERSONAS, sitShift, type PersonaId, type Style } from "../lib/hiring/personas";
import { DECISIONS, scoreAssessment, type AssessmentResult } from "../lib/hiring/scoring";
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
  console.log("floor     " + Object.entries(state.assign).map(([emp, station]) => `${emp}:${station.slice(0, 4)}${state.locks[emp] ? "*" : ""}`).join(" ") + `  (* locked) riders ${state.riders.on}${state.riders.standby ? "+2" : ""}${state.riders.desk ? ` desk ${state.riders.desk}` : ""} · perishables ${state.audit.doneAt === null ? "not done" : clockLabel(state.audit.doneAt)}`);
  console.log("projected " + JSON.stringify(state.floor?.projected, (_, v) => (typeof v === "number" ? Math.round(v * 100) : v)) + ` reserve ${state.floor?.reserve.join(",")}`);
  console.log("\nactions");
  for (const entry of state.log) {
    const c = entry.after.coverage;
    console.log(
      `  ${clockLabel(entry.simTime)}→${clockLabel(entry.simAfter)} ${pad(entry.scene, 11)} ${pad(entry.eventType + (entry.entityId ? `:${entry.entityId}` : ""), 26)}` +
        ` ctd ${pad(entry.after.ctd, 4)} wait ${pad(entry.after.ordersWaiting, 3)} staged ${pad(entry.after.staged, 3)} ppi ${pad(entry.after.ppi, 5)} pull ${pad(Math.round(entry.after.pull * 100), 4)}` +
        ` pick ${pad(Math.round(c.picking * 100), 4)} put ${pad(Math.round(c.putaway * 100), 4)} aud ${pad(Math.round(c.auditing * 100), 4)} riders ${Math.round(c.riders * 100)}`,
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
/* ── One decision, one score ──────────────────────────────────────────── */

const grouped = DECISIONS.flatMap((decision) => decision.behaviours);
check("every behaviour belongs to exactly one decision",
  grouped.length === sample.evidence.length && new Set(grouped).size === grouped.length &&
    sample.evidence.every((e) => grouped.includes(e.behaviourId)), `${grouped.length} grouped, ${sample.evidence.length} scored`);
check("a decision's behaviours all sit in its own competency",
  DECISIONS.every((decision) => decision.behaviours.every((id) => sample.evidence.find((e) => e.behaviourId === id)!.competencyId === decision.competencyId)));
const perDecision = Object.fromEntries(COMPETENCIES.map((id) => [id, DECISIONS.filter((d) => d.competencyId === id).length]));
check("decisions per competency: 5 / 4 / 4 / 4 / 4, so none is more than a quarter of its competency",
  perDecision.teamManagement === 5 && COMPETENCIES.slice(1).every((id) => perDecision[id] === 4), JSON.stringify(perDecision));
check("a competency is the plain average of its decisions",
  sample.competencies.every((c) => {
    const own = sample.decisions.filter((d) => d.competencyId === c.id && d.observed);
    return c.score === Math.round((own.reduce((sum, d) => sum + d.earned / d.available, 0) / own.length) * 100);
  }));

// Closing the case badly is one bad decision, not three: it can cost Inventory
// a quarter of its score and no more, whatever is done with the three parts of it.
{
  const base = PERSONAS.balancedLeader;
  const good = scoreAssessment(sitShift("A", base).state);
  const badClose = scoreAssessment(
    sitShift("A", { ...base, kase: { ...base.kase, units: ["writeoff", "writeoff", "theft"], steps: ["writeOff", "accuse"], controls: ["remindTeam"] } }).state,
  );
  const drop = comp(good, "inventoryManagement") - comp(badClose, "inventoryManagement");
  check("one badly closed case costs Inventory at most a quarter", drop > 0 && drop <= 25, `${comp(good, "inventoryManagement")} → ${comp(badClose, "inventoryManagement")}`);
}

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

  // Both people decisions failed and the planning ones sound: two decisions in five, and no more.
  check(tag("command-and-control: weak Team Management, and not waved through"),
    comp(command, "teamManagement") <= 60 && !command.indication.startsWith("STRONG") && command.signature.name === "HARD DRIVER · TRUST RISK",
    `${comp(command, "teamManagement")} · ${command.indication} · ${command.signature.name}`);
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

  const riyaRemoved = run(form, { ...base, riya: { inspect: false, choices: ["returnAgency"] } });
  check(tag("Riya sent back → putaway is weaker when the three problems land"),
    riyaRemoved.state.triageAt!.coverage.putaway < good.state.triageAt!.coverage.putaway - 0.05 && riyaRemoved.state.outcome!.riyaOutput === 0,
    `${riyaRemoved.state.triageAt!.coverage.putaway.toFixed(2)} vs ${good.state.triageAt!.coverage.putaway.toFixed(2)}`);

  const riyaPressed = run(form, { ...base, riya: { inspect: false, choices: ["target"] } });
  check(tag("Riya held to the pick target → she walks out at her break"),
    riyaPressed.state.riya.leftAt !== null && riyaPressed.state.outcome!.events.some((e) => e.text.includes("did not come back")));

  const riyaOpen = run(form, { ...base, riya: { inspect: true, choices: ["keep"] } });
  check(tag("Riya's device left open → the app keeps sending her orders"),
    riyaOpen.state.outcome!.riyaOutput === 0 && good.state.outcome!.riyaOutput > 0,
    `${riyaOpen.state.outcome!.riyaOutput} vs ${good.state.outcome!.riyaOutput}`);

  const arjunThreat = run(form, { ...base, arjun: { check: [], place: "here", ack: "dismiss", clarify: "deflect", request: "threat" } });
  const arjunNone = run(form, { ...base, arjun: { ...base.arjun, request: "none" } });
  check(tag("Arjun not asked → he leaves at 06:30 and the peak is harder"),
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
  check(tag("count done personally is the manager's own work, with a trained associate free"),
    farhanSelf.state.personal.some((p) => p.task === "count" && p.fitAvailable) && !good.state.personal.some((p) => p.task === "count") &&
      score(farhanSelf.result, "I7") < score(good.result, "I7"),
    `I7 ${score(farhanSelf.result, "I7")} vs ${score(good.result, "I7")}`);

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
  check(tag("Arjun covers other work as well as he was treated"),
    outputOf(arjunThreat.state, "arjun", "putaway") < outputOf(good.state, "arjun", "putaway") - 0.15,
    `${outputOf(arjunThreat.state, "arjun", "putaway").toFixed(2)} vs ${outputOf(good.state, "arjun", "putaway").toFixed(2)}`);

  const noCover = run(form, { ...base, absence: ["short"] });
  check(tag("no cover booked → thinner at the forecast, and scored as such"),
    noCover.state.absence!.projectedMin < good.state.absence!.projectedMin - 0.05 && score(noCover.result, "T3") < score(good.result, "T3"),
    `forecast ${noCover.state.absence!.projectedMin.toFixed(2)} vs ${good.state.absence!.projectedMin.toFixed(2)}; T3 ${score(noCover.result, "T3")} vs ${score(good.result, "T3")}`);

  // Unlocking the wrong device: a picker gained, and the bins that feed every picker lost.
  {
    const s = good.state;
    check(tag("the three forms ask for three different fixes"),
      s.bn.constraintAtStart !== null && ["picking", "putaway", "riders"].includes(s.bn.constraintAtStart), String(s.bn.constraintAtStart));
  }

  // The device lock is the lever the whole floor turns on.
  const built = good.state.floor!.projected;
  check(tag("the balanced floor covers picking, putaway and riders, with devices left open"),
    Math.min(built.picking, built.putaway, built.riders) >= 0.95 && good.state.floor!.reserve.length >= 2 && good.state.floor!.uncovered.length === 0,
    `${built.picking.toFixed(2)} ${built.putaway.toFixed(2)} ${built.riders.toFixed(2)} reserve ${good.state.floor!.reserve.join(",")}`);
  check(tag("the morning perishables check is finished before the rush"),
    good.state.audit.doneAt !== null && good.state.audit.doneAt <= 2100 && !good.result.flags.some((f) => f.id === "perishables"));

  check(tag("cross-scenario evidence is produced"), good.result.crossScenario.length >= 3 && riyaRemoved.result.crossScenario.length >= 3,
    `${good.result.crossScenario.length}`);
  check(tag("interview probes come from the evidence"), neglected.result.probes.length >= 3 && neglected.result.probes.every((p) => p.evidence.length > 20));
}

/* ── The floor board: agency staff, and what the percentages are made of ── */

console.log("\nfloor board\n");

for (const form of FORMS) {
  const tag = (name: string) => `[${form}] ${name}`;
  const at = (n: number) => n * 1000;
  const take = { a: { t: "takeShift" } as const, at: at(1) };
  const start = replay(form, [take]);

  const two = replay(form, [take, { a: { t: "agency", count: 2 }, at: at(2) }]);
  check(tag("agency staff can be called in from the floor board, paid by the hour"),
    two.agency === 2 && two.cost === 2 * 640 && two.tempArrivesAt !== null &&
      forecastParts(two).picking.people === forecastParts(start).picking.people + 2 &&
      forecastParts(two).picking.own > forecastParts(start).picking.own + 0.1,
    `agency ${two.agency} cost ${two.cost} own ${forecastParts(start).picking.own.toFixed(2)} → ${forecastParts(two).picking.own.toFixed(2)}`);

  const lock = { a: { t: "lockFloor" } as const, at: at(3) };
  const kept = replay(form, [take, { a: { t: "agency", count: 2 }, at: at(2) }, lock, { a: { t: "absence", choices: ["onDemand", "extend"] }, at: at(4) }]);
  const dropped = replay(form, [take, { a: { t: "agency", count: 2 }, at: at(2) }, lock, { a: { t: "absence", choices: ["short"] }, at: at(4) }]);
  const single = replay(form, [take, lock, { a: { t: "absence", choices: ["onDemand"] }, at: at(4) }]);
  check(tag("the staffing decision keeps, cancels or makes the booking"),
    kept.agency === 2 && kept.cost === 1280 && dropped.agency === 0 && dropped.cost === 0 && dropped.tempArrivesAt === null &&
      single.agency === 1 && single.cost === 640,
    `kept ${kept.agency}/${kept.cost} dropped ${dropped.agency}/${dropped.cost} single ${single.agency}/${single.cost}`);
  check(tag("more than two agency staff is not on offer"),
    replay(form, [take, { a: { t: "agency", count: 3 }, at: at(2) }]).agency === 0);

  // Moving a picker to putaway with the device unlocked: the board has to be able to say what happened.
  const moved = replay(form, [take, { a: { t: "assign", emp: "kiran", to: "putaway" }, at: at(2) }]);
  const before = forecastParts(start);
  const after = forecastParts(moved);
  check(tag("moving a picker to putaway shows as one picker fewer and one putaway hand more"),
    after.picking.people === before.picking.people - 1 && after.picking.own < before.picking.own - 0.05 &&
      after.putaway.people === before.putaway.people + 1 && after.putaway.own > before.putaway.own + 0.2 &&
      after.putaway.unlocked === before.putaway.unlocked + 1,
    `picking ${before.picking.own.toFixed(2)} → ${after.picking.own.toFixed(2)}, putaway ${before.putaway.own.toFixed(2)} → ${after.putaway.own.toFixed(2)}`);
  const lockedMove = replay(form, [take, { a: { t: "assign", emp: "kiran", to: "putaway" }, at: at(2) }, { a: { t: "lock", emp: "kiran", locked: true }, at: at(3) }]);
  check(tag("and locking that device is what makes the move count at 06:30"),
    projectedPeak(lockedMove).putaway > projectedPeak(moved).putaway + 0.05,
    `putaway ${projectedPeak(moved).putaway.toFixed(2)} unlocked → ${projectedPeak(lockedMove).putaway.toFixed(2)} locked`);
}

/* ── Running out of time ──────────────────────────────────────────────── */

console.log("\nunfinished shifts\n");

for (const form of FORMS) {
  const { actions } = sitShift(form, base);
  const full = results.balancedLeader[form].result;
  const cutAt = (share: number) => scoreAssessment(expire(replay(form, actions.slice(0, Math.floor(actions.length * share)))));
  const half = cutAt(0.5);
  const brief = cutAt(0.2);
  const tag = (name: string) => `[${form}] ${name}`;

  const standard = Math.round(full.competencies.reduce((sum, c) => sum + c.score * c.weight, 0));
  check(tag("a finished shift is Team × 0.30 + Inventory × 0.25 + Time × 0.20 + Critical × 0.15 + Customer × 0.10"),
    !full.incomplete && full.observed === full.opportunities && full.overall === standard, `${full.overall} vs ${standard}`);

  check(tag("time expiring mid-shift keeps the evidence so far"),
    half.incomplete && half.observed < half.opportunities && half.evidence.filter((e) => e.score === 3).length >= 5 &&
      half.outcomeTitle === "SHIFT NOT COMPLETED", `${half.observed}/${half.opportunities}`);

  // Competencies and decisions are read on what was reached; the score itself is out of the whole shift.
  check(tag("unreached moments are left out of each competency, and kept as a reached score"),
    half.competencies.every((c) => (c.decisions === 0 ? c.score === 0 && c.available === 0 : c.score > 0)) &&
      half.decisions.filter((d) => !d.observed).every((d) => d.score === 0 && d.available === 0) &&
      half.reachedOverall > 60, `reached ${half.reachedOverall}; ${half.competencies.map((c) => `${c.score}(${c.decisions}/${c.decisionsTotal})`).join(" ")}`);
  check(tag("the score counts unreached moments as zero, so not finishing costs"),
    half.overall < half.reachedOverall && brief.overall < half.overall && full.overall === full.reachedOverall,
    `full ${full.overall}/${full.reachedOverall} · half ${half.overall}/${half.reachedOverall} · brief ${brief.overall}/${brief.reachedOverall}`);
  check(tag("a careful candidate who does not finish scores below one who finishes"),
    half.overall < full.overall && brief.overall < 40, `full ${full.overall} · half ${half.overall} · brief ${brief.overall}`);

  check(tag("an unfinished shift is never indicated as Strong"),
    !half.indication.startsWith("STRONG") && !cutAt(0.9).indication.startsWith("STRONG"), half.indication);

  check(tag("under half the shift supports only a second look"),
    brief.observed / brief.opportunities < 0.5 && brief.indication === "ADDITIONAL ASSESSMENT RECOMMENDED",
    `${brief.observed}/${brief.opportunities} ${brief.overall} ${brief.indication}`);

  const unreached = new Set(half.evidence.filter((e) => e.behaviourTags.includes("not_reached")).map((e) => e.behaviourId));
  check(tag("probes and advice never come from a moment that was not reached"),
    half.probes.every((p) => !p.evidence.includes("The shift ended before this point")) &&
      half.evidence.filter((e) => unreached.has(e.behaviourId)).every((e) => e.opportunityToDemonstrate === false));
}

const p = (elapsed: number, phase: number) => paceOf(elapsed, phase);
check("pace: at the start the mark is at zero and nobody is behind", p(0, 0).marker === 0 && p(0, 0).behind === 0);
check("pace: ten minutes in and still on TEAM is on pace", p(600, 1).behind === 0);
check("pace: fifteen minutes in and still on TEAM is five behind", p(900, 1).behind === 300 && p(900, 1).marker > 2 / 6 && p(900, 1).marker < 3 / 6,
  JSON.stringify(p(900, 1)));
check("pace: being ahead is never 'behind'", p(300, 3).behind === 0 && p(1800, 5).marker === 1);

/* ── The assistant explains, and does not advise ──────────────────────── */

console.log("\nassistant\n");

const dead = allSuggestions().filter((question) => ["no_match", "asked_for_answer"].includes(answer(question).topic));
check("every question the assistant suggests has an answer", dead.length === 0, dead.join(" | "));

const TERMS: [string, string][] = [
  ["what is ctd", "ctd"],
  ["What does CTD mean?", "ctd"],
  ["what is a nil pick", "nil_pick"],
  ["what does 88% mean", "coverage"],
  ["what is flexible reserve", "reserve"],
  ["how do i move someone", "move_people"],
  ["what is variance", "variance"],
  ["what is the exception tote", "exception"],
  ["what does unlocked mean", "device_lock"],
  ["how do I lock a device", "device_lock"],
  ["what is putaway", "putaway"],
  ["what is the perishables check", "auditing"],
  ["what are standby riders", "riders"],
  ["what is pick speed", "ppi"],
  ["what are the three kinds of work", "stations"],
  ["what do I tell him", "floor_lead_reply"],
  ["the floor lead says putaway is slow but putaway is at 135%", "floor_lead_reply"],
  ["what does nothing is stuck mean", "floor_lead_reply"],
  ["what is PPI", "ppi"],
  ["what does de-list mean", "delist"],
  ["how much time do i have", "time"],
  ["the screen is stuck, farhan is still counting", "store_clock"],
  ["nothing is happening, when is he back", "store_clock"],
  ["what if my internet drops", "connection"],
  ["how am i scored", "scoring"],
  ["what is a dark store", "dark_store"],
  // The plain words on screen since the wording was simplified.
  ["what is dispatch time", "ctd"],
  ["what is the problem box", "exception"],
  ["what does item not found mean", "nil_pick"],
  ["what are backup people", "reserve"],
  ["what is the rider pickup point", "riders"],
  ["what is the fresh food check", "auditing"],
  ["why can i do only one myself", "attention_slot"],
];
const wrong = TERMS.filter(([question, topic]) => answer(question).topic !== topic).map(([question]) => `${question} → ${answer(question).topic}`);
check("terms on the screen are explained", wrong.length === 0, wrong.join(" | "));

const FISHING = [
  "what should I do about the nil pick?",
  "which option is best for Riya",
  "should I move Arjun to putaway",
  "what is the right answer",
  "is it better to count first or check records",
  "give me a hint",
  "what would you do here",
  "recommend who should count the cage",
];
const leaked = FISHING.filter((question) => answer(question).topic !== "asked_for_answer");
check("questions fishing for the answer are declined", leaked.length === 0, leaked.join(" | "));

/* ── The employer's two-page brief ────────────────────────────────────── */

// An employer has never sat the simulation: nothing in the brief may name a
// person, item, order, form or clock time from inside it.
const INSIDE = [
  ...ROSTER.map((employee) => employee.name),
  ...Object.values(FORM_CONTENT).flatMap((form) => [form.highValue.item, form.nilPick.item, form.nilPick.order]),
  "Form A", "Form B", "Form C", "Aisle", "cage", "Floor Lead", "nil pick", "Nil Pick",
];
const named = allBriefText().filter((line) => INSIDE.some((word) => line.includes(word)) || /\b0?[56]:\d\d\b/.test(line));
check("the employer brief names nothing from inside the simulation", named.length === 0, named.join(" | "));

for (const id of Object.keys(PERSONAS) as PersonaId[]) {
  for (const form of FORMS) {
    const brief = buildEmployerBrief(scoreAssessment(sitShift(form, PERSONAS[id]).state), { candidate: "x" });
    check(`${id} ${form}: brief has questions to ask`, brief.probes.length >= 3, String(brief.probes.length));
    check(`${id} ${form}: brief lists at most five weaknesses`, brief.weaknesses.length <= 5);
  }
}

console.log(failures.length ? `\n${failures.length} FAILED\n` : "\nall checks passed\n");
process.exit(failures.length ? 1 : 0);
