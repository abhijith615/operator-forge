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
| **2** | Mission engine, world state, timer, event system, three AI chat panels | **Complete — ready for review** |
| 3 | Telemetry, prompt logging, capability scoring, Operator Genome report | Not started |

Nothing from Phase 3 is stubbed out. Genome and Leaderboard say plainly that
they have not been built yet rather than showing invented data.

---

## The shift

`/start` plays the handover: the WhatsApp message lands line by line, a video
slot follows, then a five-second count-in and the hub opens.

From there a **60-minute clock** runs. It derives from the run's start
timestamp, so a refresh, a background tab or a closed laptop all resolve to the
same truth — the shift kept going without you.

**World state** ticks every five seconds: orders arrive, pickers walk baskets,
riders deliver and return, promises breach, complaints get raised, the rating
moves. It is a deterministic simulation seeded from the run id, so a shift
replays identically.

**Fourteen scheduled events** land across the hour — absences, a dead scanner,
rain, an inventory mismatch, a rider breakdown, a promo surge, a stockout, a
regional manager visit. Each mutates the world and slides in as a notification.

**The balance is deliberate.** Arrivals run at 0.55/min calm, 0.74 in rain and
1.11 under the surge; five pickers clear ~1.67/min and three clear ~1.00/min;
six riders clear ~0.88/min dry and ~0.60/min in rain. The calm opening clears
itself, rain squeezes the road, and rain plus the surge goes underwater unless
the operator has recalled staff or throttled intake. A good operator can hold
the line; a passive one watches OTIF fall from ~90% to ~40%.

**Operator actions** all cost something: expedite an order and everything behind
it waits; cancel one and the rating takes the hit instead of the queue; grant a
break and lose throughput now to keep it later; run a cycle count and spend a
picker's minutes to learn the truth about one SKU; throttle intake and trade
revenue for promises kept.

**Three colleagues** answer in real time — a stretched hub manager who will not
decide for you, an inventory lead who argues back, and a customer who does not
care about your absences. Plus an operations copilot that reads the same board
you can see and does arithmetic under pressure.

**Every unfamiliar term** is clickable: hover for a line, click for the
explanation, a concrete example from this floor, and why it matters elsewhere.

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

### Running the hour in two minutes

A 60-minute shift is hard to QA. In development only:

```
NEXT_PUBLIC_MISSION_TIME_SCALE=30
```

This runs the full arc — every event, the surge, the close-out — in about two
minutes. It is ignored in production builds; a real shift is a real hour.

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
  mission/           console, world strip, timeline, toasts, term
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
  auth/              session, server actions, validation
  mission/           engine, events, actions, glossary, config, persistence
  supabase/          browser + server clients
  constants/         mission, navigation, routes, site
  motion.ts          the shared motion vocabulary
stores/              zustand shell, mission and chat state
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
- Genome and Leaderboard are Phase 3. Once a shift ends they say **Not built
  yet** rather than pretending the gate opened onto something.
- Chat requires `OPENAI_API_KEY`. There is no scripted fallback, by design.
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
