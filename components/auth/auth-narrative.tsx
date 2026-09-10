"use client";

import { useSearchParams } from "next/navigation";

import { FIRST_SHIFT } from "@/lib/constants/mission";

/**
 * The panel beside the sign-in form.
 *
 * Sign-in is a doorway, not a destination — what sits next to it should be the
 * thing the operator was on their way to. The middleware and the guarded pages
 * already append `next`, so the destination is right there in the URL; this
 * reads it and says the matching thing. Arriving from Day 1 and being told
 * about a thirty-minute mission you did not ask for is the small kind of wrong
 * that makes a product feel assembled rather than built.
 */

interface Panel {
  eyebrow: string;
  headline: string;
  body: string;
  markers: { k: string; v: string }[];
}

const CHALLENGE: Panel = {
  eyebrow: "7-Day Challenge · Day 1",
  headline: "Try the job before you interview for it.",
  body:
    "Fifteen minutes on the floor of a dark store through the breakfast peak — one person short, a packing queue that keeps climbing, and every call on the clock. Sign in first so the score belongs to you and the leaderboard has a name to show.",
  markers: [
    { k: "Challenge", v: "Dark Store Operations" },
    { k: "Today", v: "Day 1 · The 180-Second Shift" },
    { k: "Duration", v: "15 minutes" },
    { k: "Assessed on", v: "Five operating dimensions" },
  ],
};

const MISSION: Panel = {
  eyebrow: `${FIRST_SHIFT.codename} · Standing by`,
  headline: "The store opens at nine. Somebody has to run it.",
  body: FIRST_SHIFT.tagline,
  markers: [
    { k: "Mission", v: FIRST_SHIFT.name },
    { k: "Role", v: FIRST_SHIFT.role },
    { k: "Duration", v: `${FIRST_SHIFT.durationMinutes} minutes` },
    { k: "Store", v: FIRST_SHIFT.location },
  ],
};

/**
 * The challenge is the front door — it is what the landing page leads with, so
 * it is what an operator with no stated destination is most likely here for.
 * The mission panel is shown only when `next` actually points into the app.
 */
function panelFor(next: string | null): Panel {
  // Nothing is redirected from here — this only picks copy — but a `next` the
  // sign-in flow would refuse to follow shouldn't get to choose what the page
  // says either. Same rules as `safeNext`: one leading slash, no backslashes.
  const valid =
    !!next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\");
  if (!valid) return CHALLENGE;
  return next.startsWith("/challenge") ? CHALLENGE : MISSION;
}

/**
 * Two of the aside's three flex children, returned as a fragment so the
 * layout's `justify-between` still sees the logo, the copy and the markers.
 */
function PanelBody({ panel }: { panel: Panel }) {
  return (
    <>
      <div className="relative max-w-md">
        <p className="font-mono text-[10.5px] tracking-[0.22em] text-ember-500 uppercase">
          {panel.eyebrow}
        </p>
        <h1 className="mt-6 text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-gradient text-balance">
          {panel.headline}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-mid">{panel.body}</p>
      </div>

      <dl className="relative grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line">
        {panel.markers.map((marker) => (
          <div key={marker.k} className="bg-obsidian/80 px-5 py-4 backdrop-blur-sm">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
              {marker.k}
            </dt>
            <dd className="mt-1.5 text-[13.5px] text-hi">{marker.v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function AuthNarrative() {
  return <PanelBody panel={panelFor(useSearchParams().get("next"))} />;
}

/**
 * Shown while the search params resolve. It is the same panel the default
 * branch lands on, so the common case never swaps content under the reader.
 */
export function AuthNarrativeFallback() {
  return <PanelBody panel={CHALLENGE} />;
}
