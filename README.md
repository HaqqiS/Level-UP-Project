# Calisthenics Quest

A gamified Progressive Web App for calisthenics training. Daily and weekly quests, XP, levels, and streaks keep you consistent, while an AI planner builds a personal program that adapts week by week and day by day.

> **Status:** Planning complete, MVP in development.
> **Audience:** All levels — from never trained to advanced skill work.
> **Scope:** Personal / family use, portfolio & learning project.

---

## Key Features

| Feature | Description |
|---|---|
| **Onboarding** | Experience level, goals, available equipment, training days, injuries/limits, height & weight. |
| **AI Weekly Plan** | Gemini generates a 7‑day plan with progressive overload within realistic limits. |
| **Daily Check‑in** | Energy, soreness, and available time → AI adjusts today's session within safe bounds (max 1/day, falls back to the weekly plan). |
| **Exercise Library** | Seeded from free databases and grown by AI discovery. AI‑found exercises are marked `unverified`. |
| **Quests** | Daily quest (today's session + side quests) and weekly quests. |
| **Gamification** | XP, levels, streaks (rest days don't break it), streak freeze, badges. Deterministic code, never AI. |
| **Workout Logger** | Sets, reps, duration. Offline‑first from v1. |
| **Body Tracking** | Weight & height (MVP), measurements & progress photos (later), trend charts. |
| **PWA** | Installable, mobile‑first, offline‑capable. |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Package manager | pnpm |
| Lint / format | Biome |
| UI | shadcn/ui (preset `base-luma`) + Tailwind CSS v4 + ReUI registry |
| Animation | Framer Motion |
| Auth | Better Auth (Google provider) |
| Database | PostgreSQL on Supabase |
| ORM | Prisma 7 |
| Storage | Supabase Storage |
| AI | Gemini via Vercel AI SDK, structured output + Zod |
| State | TanStack Query + Zustand |
| i18n | next-intl (EN first, ID later) |
| Offline | Serwist + Dexie |
| Charts | Recharts |
| Notifications | Web Push |
| Hosting | Vercel |

## Getting Started

```bash
pnpm install
cp .env.example .env         # fill in values
pnpm db:migrate              # apply Prisma migrations
pnpm dev                     # http://localhost:3000
pnpm lint                    # Biome check
pnpm lint:fix                # Biome check --write
pnpm test                    # Vitest unit tests
pnpm db:studio               # browse the database
```

Google OAuth redirect URI: `http://localhost:3000/api/auth/callback/google`

## Roadmap

- [ ] **MVP** — Google login, onboarding + health disclaimer, AI weekly plan + daily check‑in adjustment, daily quest, workout logger, XP/level/streak, weight log + chart
- [ ] **v1** — Offline logging & sync, PWA install, weekly quests, badges, body measurements
- [ ] **v1.5** — Push reminders, progress photos, AI chat coach
- [ ] **Later** — Social/leaderboard, exercise videos, data export, Indonesian localization

## Project Structure

```
level-up/
├── src/
│   ├── app/            # routes (App Router)
│   ├── components/     # ui (shadcn), reui, feature components
│   ├── i18n/           # next-intl config
│   ├── lib/            # auth, db, ai, gamification, offline
│   ├── server/         # actions & services
│   └── sw.ts           # service worker (Serwist)
├── messages/           # en.json, id.json
├── prisma/             # schema & migrations
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
