"use client";

import * as React from "react";
import { BarChart3, FileCheck2, ReceiptText } from "lucide-react";

import {
  ARJUN,
  ARJUN_ACK,
  ARJUN_CLARIFY,
  ARJUN_REQUEST,
  RIYA,
  RIYA_OPTIONS,
} from "@/lib/hiring/content";
import type { ArjunResponse, RiyaChoice } from "@/lib/hiring/types";
import { cn } from "@/lib/utils";

import { ActionBar, Card, Choice, Eyebrow, Facts, PrimaryButton, QuietButton, SceneHeading, Speech, Tile } from "../ui";
import type { SceneProps } from "./handover";

/* ── Riya ─────────────────────────────────────────────────────────────── */

/**
 * The Floor Lead has already decided what the problem is. Her numbers are one
 * tap away and say something else, and whether the candidate takes that tap
 * before deciding about a person is the observation.
 */
export function Riya({ state, act }: SceneProps) {
  const [chosen, setChosen] = React.useState<RiyaChoice[]>([]);
  const opened = state.riya.inspected;

  const toggle = (id: RiyaChoice) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((choice) => choice !== id) : current.length < 2 ? [...current, id] : current,
    );

  const slowest = Math.max(...RIYA.zonePpi.map((zone) => zone.ppi));
  const first = RIYA.ppiTrend[0]!;

  return (
    <>
      <SceneHeading eyebrow="17:32 · Picking line" title="Riya" sub="New picker, eleven days in." />
      <Card>
        <Speech who="Floor Lead" lines={RIYA.floorLead} />
      </Card>

      {opened ? (
        <Card className="mt-3">
          <Facts
            rows={[
              { label: "Tenure", value: RIYA.tenure },
              { label: "Accuracy", value: RIYA.accuracy },
              { label: "Scan compliance", value: RIYA.scanCompliance },
            ]}
          />

          <Eyebrow className="mt-5 mb-2">Seconds per item · last five shifts</Eyebrow>
          <ol className="flex items-end gap-2" aria-label="Seconds per item, last five shifts">
            {RIYA.ppiTrend.map((ppi, index) => (
              <li key={index} className="flex flex-1 flex-col items-center gap-1">
                <span className="tabular text-[13px] font-semibold text-hi">{ppi.toFixed(1)}</span>
                <span className="w-full rounded-t-[6px] bg-white/25" style={{ height: `${(ppi / first) * 56}px` }} />
              </li>
            ))}
          </ol>

          <Eyebrow className="mt-5 mb-2">Seconds per item · by zone</Eyebrow>
          <ul className="space-y-1.5">
            {RIYA.zonePpi.map((zone) => (
              <li key={zone.zone} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-[13px] text-mid">Zone {zone.zone}</span>
                <span className="h-2.5 flex-1 rounded-full bg-white/[0.06]">
                  <span
                    className={cn("block h-full rounded-full", zone.ppi === slowest ? "bg-warn-500" : "bg-white/35")}
                    style={{ width: `${(zone.ppi / slowest) * 100}%` }}
                  />
                </span>
                <span className="tabular w-10 shrink-0 text-right text-[13.5px] font-semibold text-hi">{zone.ppi.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-snug text-mid">{RIYA.zoneNote}</p>

          <div className="mt-4 border-t border-line pt-4">
            <Speech who="Riya" lines={[RIYA.quote]} />
          </div>
        </Card>
      ) : (
        <div className="mt-3">
          <Tile label="Open Riya’s numbers" icon={<BarChart3 />} onClick={() => act({ t: "inspect", item: "riyaNumbers" })} />
        </div>
      )}

      <Eyebrow className="mt-5 mb-2">Your call · choose up to two</Eyebrow>
      <div className="grid gap-2 sm:grid-cols-2">
        {RIYA_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            selected={chosen.includes(option.id)}
            disabled={!chosen.includes(option.id) && chosen.length >= 2}
            onClick={() => toggle(option.id)}
          >
            {option.label}
          </Choice>
        ))}
      </div>

      <ActionBar>
        <PrimaryButton disabled={chosen.length === 0} onClick={() => act({ t: "riya", choices: chosen })}>
          Tell the Floor Lead
        </PrimaryButton>
      </ActionBar>
    </>
  );
}

/* ── Arjun ────────────────────────────────────────────────────────────── */

function Group<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <Eyebrow className="mb-2">{label}</Eyebrow>
      <div className="grid gap-1.5">
        {options.map((option) => (
          <Choice key={option.id} selected={value === option.id} onClick={() => onChange(option.id)}>
            “{option.label}”
          </Choice>
        ))}
      </div>
    </div>
  );
}

/**
 * The store's fastest picker, with a real grievance, twenty-five minutes
 * before the peak. Where the conversation happens, what is checked first and
 * what is said are three separate decisions, and he remembers all of them.
 */
export function Arjun({ state, act }: SceneProps) {
  const { place, checked } = state.arjun;
  const [responding, setResponding] = React.useState(false);
  const [ack, setAck] = React.useState<ArjunResponse["ack"] | null>(null);
  const [clarify, setClarify] = React.useState<ArjunResponse["clarify"] | null>(null);
  const [request, setRequest] = React.useState<ArjunResponse["request"] | null>(null);

  const knows = checked.includes("incentiveStatus");
  const clarifyOptions = ARJUN_CLARIFY.filter((option) => (option.needsCheck ? knows : option.withoutCheck ? !knows : true));

  return (
    <>
      <SceneHeading eyebrow="17:34 · Picking line" title="Arjun" sub="Expert picker. Day shift, off at 18:00." />
      <Card>
        <Speech who="Arjun" lines={ARJUN.lines} />
      </Card>

      {!place ? (
        <>
          <Eyebrow className="mt-5 mb-2">Where do you have this conversation?</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice go onClick={() => act({ t: "arjunPlace", place: "here" })} detail="On the line, in front of the other pickers.">
              Speak here
            </Choice>
            <Choice go onClick={() => act({ t: "arjunPlace", place: "aside" })} detail="Step away from the line for a minute.">
              Move aside
            </Choice>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-[13px] text-lo">{place === "aside" ? "You have stepped away from the line." : "You are on the line. The other pickers can hear."}</p>

          {checked.includes("incentiveStatus") ? (
            <Card className="mt-3">
              <Eyebrow className="mb-3">Incentive status · last week</Eyebrow>
              <Facts rows={ARJUN.incentiveStatus} />
            </Card>
          ) : null}
          {checked.includes("eligibility") ? (
            <Card className="mt-3">
              <Eyebrow className="mb-3">Extension eligibility</Eyebrow>
              <Facts rows={ARJUN.eligibility} />
            </Card>
          ) : null}

          {!responding ? (
            <div className="mt-3 grid gap-2">
              {!checked.includes("incentiveStatus") ? (
                <Tile label="Check incentive status" icon={<ReceiptText />} onClick={() => act({ t: "inspect", item: "incentiveStatus" })} />
              ) : null}
              {!checked.includes("eligibility") ? (
                <Tile label="Check eligibility" icon={<FileCheck2 />} onClick={() => act({ t: "inspect", item: "eligibility" })} />
              ) : null}
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <Group label="Acknowledge" options={ARJUN_ACK} value={ack} onChange={setAck} />
              <Group label="Clarify" options={clarifyOptions} value={clarify} onChange={setClarify} />
              <Group label="Request" options={ARJUN_REQUEST} value={request} onChange={setRequest} />
            </div>
          )}

          <ActionBar>
            {responding ? (
              <>
                <QuietButton
                  onClick={() => {
                    setResponding(false);
                    // What can honestly be said depends on what has been checked.
                    setClarify(null);
                  }}
                >
                  Back
                </QuietButton>
                <PrimaryButton
                  disabled={!ack || !clarify || !request}
                  onClick={() => ack && clarify && request && act({ t: "arjunRespond", ack, clarify, request })}
                >
                  Say it
                </PrimaryButton>
              </>
            ) : (
              <PrimaryButton onClick={() => setResponding(true)}>Respond now</PrimaryButton>
            )}
          </ActionBar>
        </>
      )}
    </>
  );
}
