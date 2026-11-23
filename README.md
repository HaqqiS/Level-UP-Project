# Calisthenics Quest

A gamified Progressive Web App for calisthenics training. Daily and weekly quests, XP, levels, and streaks keep you consistent, while an AI planner builds a personal program that adapts week by week and day by day.

> **Status:** v2.5 delivered (Consistency & Adherence Dashboard Metrics in `/profile?tab=metrics`); Later roadmap items planned next.
> **Audience:** All levels — from never trained to advanced skill work.
> **Scope:** Personal / family use, portfolio & learning project.

---

## Key Features

| Feature | Description |
|---|---|
| **Onboarding & Redo Onboarding** | Experience level (including `Never trained`), goals, available equipment, training days, injuries/limits, height & weight, and optional menstrual cycle tracking for female users. |
| **AI Weekly Plan** | Gemini (`gemini-3.8-flash` fallback chain) generates a 7‑day plan with progressive overload within realistic limits, plus a **"Regenerate with AI"** retry option. |
| **Daily Check‑in & Wellness Adaptation** | Energy, soreness, available time, and daily wellness context → AI adapts today's session within safe bounds (−40% / +15%, max 1/day, falls back to the planned session). |
| **Calendar Wellness Tracker** | Borderless `/calendar` tracking period flow, pain tags, supplements, medications, sleep duration (ReUI 24h `TimePicker`), and readiness/hydration/notes. |
| **26-Region Anatomical Muscle Map** | Male/Female front & back SVG heatmap (`Trained` vs `Planned`, `Today`/`Weekly`/`30d`) with hover tooltips and tap breakdown sheets. |
| **Exercise Library & 3-Tier DAG Skill Tree** | **116** curated exercises (including **18** zero-equipment foundations), `Bronze`/`Silver`/`Gold` mastery benchmarks, interactive Skill Tree DAG canvas/tier list, and AI discovery (`unverified`). |
| **Quests & Gamification** | Daily/side/weekly quests, XP, levels, streaks (rest days don't break it), weekly streak freeze, and achievements — all deterministic in code, never AI. |
| **Workout Logger** | 1–2 tap set logging (reps/duration) with offline‑first Dexie queue and idempotent sync. |
| **Body Tracking** | Weight log + 30d/90d trend chart and batch measurements (`WAIST`, `CHEST`, `ARM`) with unified collapsible history. |
| **Dashboard Metrics (v2.5)** | Consistency & Adherence analytics in `/profile?tab=metrics` (`7D`/`30D`/`90D`/`All`, period deltas, Scheduled vs Completed chart, Training Duration trend, 12-week Consistency Grid, and Mon–Sun adherence breakdown). |
| **Theme, PWA & Account** | Light/Dark/System themes, Apple HIG floating 4‑tab bar, Card‑Only UI, Web Push reminders (`TimePicker`), installable PWA, 4-tab `/profile` hub, and permanent Delete Account. |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Package manager | pnpm |
| Lint / format | Biome |
| UI | shadcn/ui (preset `base-luma`, `@base-ui/react`) + Tailwind CSS v4 + ReUI (`DatePicker`, `TimePicker`, `NumberField`) |
| Theming | next-themes (Light / Dark / System) |
| Animation | Framer Motion |
| Auth | Better Auth (Google provider) |
| Database | PostgreSQL on Supabase |
| ORM | Prisma 7 |
| AI | Gemini (`gemini-3.8-flash` fallback chain) via Vercel AI SDK v7 (`generateText` + `Output.object`) + Zod |
| State | TanStack Query + Zustand |
| i18n | next-intl (EN first, ID later) |
| Offline | Serwist + Dexie |
| Charts | Recharts |
| Notifications | Web Push (VAPID + Serwist SW + cron) |
| Testing | Vitest |
| Hosting | Vercel (planned) |

## Getting Started

```bash
pnpm install
cp .env.example .env         # fill in values
pnpm db:migrate              # apply Prisma migrations
pnpm db:seed                 # seed curated exercises & DAG progressions
pnpm dev                     # http://localhost:3000
pnpm lint                    # Biome check
pnpm lint:fix                # Biome check --write
pnpm test                    # Vitest unit tests
pnpm build && pnpm start     # production build & preview
pnpm db:studio               # browse the database
```

Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Roadmap

- [x] **MVP** — Google login, onboarding + health disclaimer, AI weekly plan + daily check-in adjustment, daily quest, workout logger, XP/level/streak, weight log + chart, exercise library
- [x] **v1** — Offline logging & sync (Dexie), PWA install (Serwist), weekly quests, achievements, body measurements
- [x] **v1.5** — 4-tab route consolidation (`/today`, `/calendar`, `/exercises`, `/profile`), onboarding & streak freeze polish, Web Push reminders (VAPID + cron)
- [x] **v2** — Relational v2 schema, period-aware onboarding & AI planner (no fertile window, H-2 reminders), borderless filterable Calendar wellness tracker, 26-region Male/Female anatomical Muscle Map, 116-exercise 3-tier DAG Skill Tree (18 zero-equipment foundations), Light/Dark/System themes, Apple HIG floating tab bar, Card-Only UI remodel, ReUI TimePicker & batch body measurements, permanent Delete Account
- [x] **v2.5** — Dashboard metrics (Consistency & Adherence analytics in `/profile?tab=metrics`)
- [ ] **Later** — Indonesian localization (`messages/id.json` + language switcher), data export (JSON/CSV), exercise videos, social/leaderboard, production deployment

*(Progress photos and AI chat coach were cancelled in [DECISIONS.md](docs/DECISIONS.md) ADR #014.)*

## Project Structure

```
level-up/
├── src/
│   ├── app/            # routes (App Router)
│   ├── components/     # ui (shadcn), reui, feature components
│   ├── i18n/           # next-intl config
│   ├── lib/            # auth, db, ai, body, exercises, gamification, metrics, wellness, push, offline
│   ├── server/         # actions & services
│   └── sw.ts           # service worker (Serwist)
├── messages/           # en.json (id.json planned)
├── prisma/             # schema, migrations & modular seed-data
├── public/             # manifest, icons
└── docs/
```

## Documentation

| Document | Content |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Goals, personas, user stories, scope per phase, acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, AI flows, gamification engine, offline, security |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log (ADR‑lite) |

## Health Disclaimer

Calisthenics Quest is not medical advice. Consult a professional before starting a new program, especially with injuries or health conditions. Stop any exercise that causes pain.

## License

TBD.
