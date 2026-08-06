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
| **1** | Design system, landing page, authentication, dashboard shell, navigation, animations | **Complete — ready for review** |
| 2 | Mission engine, world state, timer, event system, three AI chat panels | Not started |
| 3 | Telemetry, prompt logging, capability scoring, Operator Genome report | Not started |

Nothing from Phase 2 or 3 is stubbed out. Panels that depend on a running
mission render an explicit standing state that says when they come online,
rather than showing invented data.

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
  (app)/             everything behind the mission shell
  auth/callback/     OAuth + magic-link exchange
components/
  ui/                primitives (button, input, dialog, popover, …)
  motion/            reveal, spotlight card, count-up, marquee
  landing/           marketing sections
  shell/             sidebar, topbar, command menu, page transitions
  visuals/           aurora, grid field, horizon
  brand/             logo and wordmark
features/
  mission/           mission briefing
  settings/          identity form, motion status
hooks/               clock, media query, scroll, shell shortcuts
lib/
  auth/              session, server actions, validation
  supabase/          browser + server clients
  constants/         mission, navigation, routes, site
  motion.ts          the shared motion vocabulary
stores/              zustand shell state
styles/              design tokens and utilities
types/               operator, mission, navigation
supabase/            SQL schema
```

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
- The mission launch button is deliberately disabled and labelled — the mission
  engine is Phase 2, and a button that pretended to start a shift would be worse
  than one that admits it is not armed yet.
- Testimonial copy carries a visible **Placeholder copy** badge and the sample
  leaderboard is labelled **Sample**; operators appear by callsign, not name.
