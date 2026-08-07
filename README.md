# OPERATOR FORGE

**The Flight Simulator for Future Operators.**

Sixty minutes running a ten-minute delivery hub. Orders arrive whether or not
you are ready. Three colleagues answer in real time. There is no multiple
choice — only what you decide to do next.

---

## Phase status

This repository is being built in three reviewed phases.

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Design system, landing page, authentication, dashboard shell, navigation, animations | Complete |
| 2 | Mission engine, world state, timer, event system, three AI chat panels | Complete |
| **3** | Telemetry, prompt logging, capability scoring, Operator Genome report | **Complete — ready for review** |

All three phases are built. Nothing in the product shows invented data: where
there is genuinely no cohort to rank against, the leaderboard says so rather
than reporting a rank of one.

---

## The shift

`/start` plays the handover: the WhatsApp message lands line by line, a video
slot follows, then a five-second count-in and the hub opens.

From there a **30-minute clock** runs. It derives from the run's start
timestamp, so a refresh, a background tab or a closed laptop all resolve to the
same truth — the shift kept going without you.

### The queue is the mission

The shift is **not event-driven**. A hub supervisor is never waiting for
something to happen; they are choosing which of six things to drop. So the
scheduler's job is to keep the operator pleasantly underwater:

- A new task lands every **20–45 seconds**, faster when the board is thin.
- **3–8 tasks are always pending.** The queue is never empty and never quiet.
- Roughly **68 tasks** arrive across 30 minutes. Nobody clears them all.
- Every task **expires**, and every expiry leaves a mark — a rating hit, a
  worker who walked, phantom stock, or a cascade that puts something worse on
  the board.

Work comes from **four parallel streams** — Operations, People, Customers and
Management — drawn from a catalogue of ~46 templates that read live floor state.
Most of it is ordinary hub work (attendance, cycle counts, goods receipt, safety
walks, handover notes), not emergencies. Two tasks never name the same worker,
rider or order at once.

### Everything scores

Each option carries a `quality` (0–1) and the capabilities it is evidence for.
Every call is recorded with the option chosen, **how long it took**, and **how
deep the queue was at that moment**:

```ts
{ templateId, stream, priority, at, latency, optionId, quality,
  capabilities, expired, queueDepth }
```

That is the substrate Phase 3 scores. The operator never sees any of it.

### The floor underneath

**World state** ticks every five seconds: orders arrive, pickers walk baskets,
riders deliver and return, promises breach, the rating moves. A deterministic
simulation seeded from the run id, so a shift replays identically. Effects are
**data, not closures**, so tasks survive a refresh and Phase 3 can replay what
each decision did.

**Eight world shocks** change the shape of the floor rather than supplying its
content — absences at 1:30, rain at 5:00, a rider down at 9:00, a promo surge at
13:00, the regional manager at 17:00 and 22:00.

**The balance is deliberate.** Arrivals run at 0.55/min calm, 0.74 in rain and
1.11 under the surge; five pickers clear ~1.67/min and three clear ~1.00/min;
six riders clear ~0.88/min dry and ~0.60/min in rain. The calm opening clears
itself, rain squeezes the road, and rain plus the surge goes underwater unless
the operator has recalled staff or throttled intake.

### The control room

Three columns, all live, nothing behind a navigation click: **communications**
on the left (the three colleagues inline), the **live floor** in the middle,
the **task queue and timeline** on the right. Below `xl` the same three panels
become lanes. The deep-dive panels — Orders, Inventory, People, Customers —
remain as full pages for anyone who wants to go and look.

**Three colleagues** answer in real time. Plus an operations copilot that reads
the same board you can see. **Every unfamiliar term** is clickable. **Seven
achievements** recognise a way of working — none can be farmed by clicking fast.

---

## The debrief

### Telemetry

Invisible during the shift, recorded throughout: which panel was opened and for
how long, every message sent and how specific it was, every glossary term looked
up, every control used, and every tab switch. Not literally every click — a log
of mouse events is noise; a log of *where attention went* is evidence.

### Scoring

Ten capability readings, each blended from three or four independent signals so
no single behaviour can carry an axis. A few examples:

- **Curiosity** — did they open a relevant panel in the ninety seconds *before*
  deciding, look terms up, ask questions.
- **Prioritization** — did critical work survive while routine work expired, and
  was the median latency on critical calls lower than on normal ones.
- **Learning agility** — quality and speed in the last third of the shift
  against the first third.
- **Stress handling** — quality at a queue depth of six or more, against quality
  at a depth of three or less.

Evidence-poor axes are marked **low confidence** and say so on the report rather
than being quietly guessed at. Bands (Emerging → Distinctive) are shown; the
underlying 0–1 score never is.

### The Genome

`/genome` after handover: an animated ten-axis radar, a signature archetype
drawn from the two strongest axes, the ten readings each opening onto the actual
decisions behind them, a story of the shift anchored to real minutes and real
option labels, and a **replay** — scrub the thirty minutes and watch the rating
and the queue move against the record.

The Genome is recomputed from the stored decisions rather than saved, so
improving the scoring model improves past shifts too. The record is the
decisions; the reading of them is derived.

### Standings

`/leaderboard` shows Operator Rating, movement against your previous run, weekly
streak by ISO calendar week, and your full run history. Rank is computed across
every completed run of the mission when Supabase is connected — and reports
nothing at all when there is no cohort, because a rank of one is flattery.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>.

### Simulator Mode

With no Supabase keys present the app runs in **Simulator Mode**: signing in
mints a local, cookie-backed operator identity so the entire experience is
walkable without provisioning a backend. It is a development affordance only —
the login screen states this plainly, and it switches off the moment real keys
appear.

### Connecting the AI colleagues

Messages and the AI Assistant need a model key. Add to `.env.local`:

```
OPENAI_API_KEY=sk-…
```

Without it the rest of the shift runs exactly as normal and both chat panels say
plainly that they are not connected. Scripted replies would have made the whole
premise dishonest, so there are none.

### Running the shift in three minutes

A 30-minute shift is hard to QA. In development only:

```
NEXT_PUBLIC_MISSION_TIME_SCALE=10
```

This runs the full arc — every world shock, the whole task queue, the close-out
— in about three minutes. It is ignored in production builds; a real shift runs
in real time.

### Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It
   creates the `operators` table with row-level security scoped to `auth.uid()`.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. In **Authentication → Providers**, enable Google and Email (magic link).
5. In **Authentication → URL Configuration**, add `<site-url>/auth/callback` as
   a redirect URL.

Restart the dev server. Google OAuth and magic links now run for real, and
Simulator Mode disappears.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Architecture

```
app/
  (auth)/            login + onboarding, split-screen shell
  (launch)/start/    handover message → video → count-in
  (app)/             everything behind the mission shell
  api/chat/          streaming agent + copilot endpoint
  auth/callback/     OAuth + magic-link exchange
components/
  ui/                primitives (button, input, dialog, popover, …)
  motion/            reveal, spotlight card, count-up, marquee
  landing/           marketing sections
  shell/             sidebar, topbar, command menu, page transitions
  genome/            radar, capability panel, reflection, replay
  leaderboard/       standings
  mission/           control room, task queue, world strip, timeline, term
    panels/          orders, inventory, people, customers
  chat/              threads, composer, markdown, message list
  visuals/           aurora, grid field, horizon
  brand/             logo and wordmark
features/
  mission/           briefing, launch card, shift close-out
  settings/          identity form, motion + sound preferences
hooks/               clock, media query, mission tick, run sync, shortcuts
lib/
  agents/            personas, world briefing, copilot prompt
  genome/            signals, scoring, narrative, cohort
  auth/              session, server actions, validation
  mission/           engine, events, effects, achievements, glossary, config
    tasks/           the catalogue and the scheduler that keeps the queue full
  supabase/          browser + server clients
  constants/         mission, navigation, routes, site
  motion.ts          the shared motion vocabulary
stores/              zustand shell, mission, chat, telemetry and history state
styles/              design tokens, utilities, markdown
types/               operator, world, mission-run, agents, navigation
supabase/            SQL schema
```

### Where the simulation lives

`lib/mission/engine.ts` is a pure function: same world plus same seed always
produces the same next world. `lib/mission/actions.ts` is the same for operator
decisions. Nothing in either file touches React, which is what makes the Phase 3
replay trustworthy.

The browser holds the authoritative live state — a shift has to survive a
refresh without a round trip. `mission_runs` in Supabase holds the durable
record, written on start, every 60 seconds, and at handover.

### Route protection

`middleware.ts` refreshes the Supabase session on every navigation and guards
routes in one place:

- signed out + app route → `/login?next=…`
- signed in + `/login` → `/mission`

Layouts re-check server-side (`getOperator`), so a stale cookie can never render
the shell. Onboarding is considered complete only when both a name and a
WhatsApp number are on file.

---

## Design system

Tokens live in [`styles/globals.css`](styles/globals.css) as Tailwind v4
`@theme` variables — there is no `tailwind.config.js`.

- **Substrate** — `void`, `obsidian`, `surface`, `elevated`, `raised`
- **Signal** — `ember` (the operator accent), `ion` (healthy systems),
  `flux` (intelligence), plus `alert` / `warn` / `info`
- **Type** — Geist Sans and Geist Mono, self-hosted. Numeric readouts use
  `data-readout` for tabular figures so nothing jitters.
- **Motion** — three curves, used consistently: `swift` (acknowledgement),
  `glide` (arrival), `settle` (mass). Defined in [`lib/motion.ts`](lib/motion.ts).
- **Utilities** — `panel`, `glass`, `sheen`, `grain`, `text-gradient`,
  `mask-fade-x/y`.

Everything honours `prefers-reduced-motion`.

---

## Keyboard

| Keys | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Command menu |
| `[` | Collapse or expand the sidebar |
| `G` then `M` / `A` / `C` / `I` / `O` / `P` / `U` / `G` / `L` / `S` | Jump to a panel |

Chords follow the Linear pattern with a 1.2 second window, and never fire while
you are typing.

---

## Notes for review

- `npm run build`, `npm run lint` and `npm run typecheck` are all clean.
- Chat requires `OPENAI_API_KEY`. There is no scripted fallback, by design.
- The Genome shows bands, never percentages, and marks thin evidence as low
  confidence instead of guessing.
- Rank is absent rather than fabricated when no cohort exists.
- After handover the floor panels stay readable but every control on them goes
  disabled, with a line saying why — a button that silently does nothing is
  worse than no button.
- Testimonial copy carries a visible **Placeholder copy** badge and the sample
  leaderboard is labelled **Sample**; operators appear by callsign, not name.
- LangGraph is not used. The agent runtime is a single streaming call per turn
  with a persona prompt and a live world briefing, isolated in `lib/agents/` —
  a graph would have been ceremony around one node, and it needs a checkpointer
  to be worth anything on serverless. If Phase 3 grows multi-step agent work,
  that module is the seam to swap.
