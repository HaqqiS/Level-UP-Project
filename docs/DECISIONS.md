# Decision Log

Lightweight ADRs. Format: context → decision → consequences.

| # | Date | Decision | Status |
|---|---|---|---|
| 001 | 2026‑11‑18 | Next.js App Router + TypeScript | Accepted |
| 002 | 2026‑11‑18 | pnpm as package manager | Accepted |
| 003 | 2026‑11‑18 | Biome replaces ESLint/Prettier | Accepted |
| 004 | 2026‑11‑18 | shadcn/ui preset `b1tfN9c4e` (`base-luma`) + ReUI registry | Accepted |
| 005 | 2026‑11‑18 | Better Auth (Google only) instead of Supabase Auth | Accepted |
| 006 | 2026‑11‑18 | Prisma 7 on Supabase Postgres | Accepted |
| 007 | 2026‑11‑19 | Audience: all levels, assessed at onboarding | Accepted |
| 008 | 2026‑11‑19 | Scale: personal/family + portfolio | Accepted |
| 009 | 2026‑11‑19 | English UI, i18n‑ready (next-intl) | Accepted |
| 010 | 2026‑11‑19 | Hybrid AI planner: weekly plan + daily adjustment | Accepted |
| 011 | 2026‑11‑19 | Growing exercise library with `unverified` AI entries | Accepted |
| 012 | 2026‑11‑19 | Gamification rules (effort‑based XP, scheduled‑day streak, freeze) | Accepted |
| 013 | 2026‑11‑19 | MVP scope includes XP/level/streak | Accepted |

---

### 003 — Biome
**Context:** The Next.js template ships ESLint, and we want a single fast tool. **Decision:** Biome for lint + format; generated `ui/`, `reui/`, `public/` ignored. **Consequences:** No `eslint-config-next` rules (e.g. some Next‑specific lints).

### 005 — Better Auth over Supabase Auth
**Context:** We want auth independent of the DB vendor, plus Prisma integration. **Decision:** Better Auth with Prisma adapter, Google provider only. **Consequences:** Supabase RLS can't rely on `auth.uid()`, so authorization lives in the server layer and there's no client‑side DB access.

### 008 — Personal scale
**Context:** Users are the owner and family; it's also a portfolio piece. **Decision:** No monetization or admin tooling at scale. Simple AI rate limits. **Consequences:** Some features (moderation, billing) are deliberately absent.

### 009 — i18n
**Context:** Bilingual is desired eventually. **Decision:** next-intl from day one, EN messages only for now. **Consequences:** All UI strings must go through `t()`.

### 010 — Hybrid AI planner
**Context:** A daily AI plan feels "AI‑powered" but costs more, while a 4‑week plan feels static. **Decision:** AI generates a 7‑day plan weekly, plus one AI adjustment per day after a check‑in (energy, soreness, time). Bounds: daily −40%/+15% volume, weekly ≤ 1 progression step per movement and ≤ 10% volume increase. Fallback to the plan or rules on failure. Chat coach in v1.5. **Consequences:** At most ~8 AI calls/user/week, so cost is negligible at personal scale.

### 011 — Exercise library
**Context:** A fixed curated list limits variety, while free‑text AI exercises break validation. **Decision:** Seed from free DBs (free-exercise-db, wger). AI can discover new exercises via search grounding, normalized with Zod and stored as `unverified`. Plans reference library IDs only. `unverified` exercises show a warning and are excluded for beginners. **Consequences:** Needs a dedupe step, attribution for CC‑BY‑SA, and an eventual verify workflow.

### 012 — Gamification
**Context:** Must be fair across levels and not punish rest. **Decision:** XP from completion/effort; streak counts scheduled days; 1 freeze per week; all deterministic in code. **Consequences:** Stats are reproducible from logs and easy to unit test.

### 013 — MVP scope
**Decision:** Google login, onboarding + disclaimer, weekly AI plan + daily adjustment, daily quest, logger, XP/level/streak, weight chart. Offline sync, PWA install, weekly quests, and badges move to v1.
