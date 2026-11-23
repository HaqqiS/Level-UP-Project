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
| 014 | 2026‑11‑20 | Cancel Progress Photos & AI Chat Coach | Accepted |
| 015 | 2026‑11‑20 | Route Consolidation into 4-Tab Bottom Navigation | Accepted |
| 016 | 2026‑11‑20 | Period-Aware AI & Integrated Calendar Wellness Tracker | Accepted |
| 017 | 2026‑11‑20 | Deterministic Skill Tree Mastery & Exercise Muscle Mapping | Accepted |
| 018 | 2026‑11‑20 | Web Push Reminders via VAPID + Cron Endpoint | Accepted |
| 019 | 2026‑11‑21 | Relational v2 Domain Schema & 3-Tier DAG Skill Tree | Accepted |
| 020 | 2026‑11‑21 | Light/Dark/System Theming (`next-themes`) & Apple HIG Floating Tab Bar | Accepted |
| 021 | 2026‑11‑21 | 3-Tab `/profile` Hub & Permanent Transactional Account Deletion | Accepted |
| 022 | 2026‑11‑22 | Zero-Dependency MIT-Ported Male/Female 26-Region Anatomical Body Map | Accepted |
| 023 | 2026‑11‑22 | Borderless Filterable `/calendar`, Non-Fertility Cycle Phases, and Ongoing-Period Guard | Accepted |
| 024 | 2026-11-23 | Gemini 3.8 Flash Fallback Chain, AI SDK v7 `Output.object`, Wire Schemas & AI Plan Retry | Accepted |
| 025 | 2026-11-23 | 18 Zero-Equipment Never-Trained Foundations & Global-Tier Skill Tree Layout | Accepted |
| 026 | 2026-11-23 | Card-Only UI Surface System (Style 4), ReUI `TimePicker`, and Batch Body Measurements with Collapsible History | Accepted |
| 027 | 2026-11-23 | v2.5 Consistency & Adherence Dashboard in `/profile?tab=metrics` & Chart Palette Upgrade | Accepted |

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
**Context:** A daily AI plan feels "AI‑powered" but costs more, while a 4‑week plan feels static. **Decision:** AI generates a 7‑day plan weekly, plus one AI adjustment per day after a check‑in (energy, soreness, time, and daily wellness context in v2). Bounds: daily −40%/+15% volume, weekly ≤ 1 progression step per movement and ≤ 10% volume increase. Fallback to the plan or rules on failure. **Consequences:** At most ~8 AI calls/user/week, so cost is negligible at personal scale.

### 011 — Exercise library
**Context:** A fixed curated list limits variety, while free‑text AI exercises break validation. **Decision:** Seed 98 curated calisthenics exercises across all movement patterns. AI can discover new exercises via search grounding, normalized with Zod and stored as `UNVERIFIED`. Plans reference library IDs only. `UNVERIFIED` exercises show a warning and are excluded for beginners. **Consequences:** Needs a dedupe step, attribution for CC‑BY‑SA, and an eventual verify workflow.

### 012 — Gamification
**Context:** Must be fair across levels and not punish rest. **Decision:** XP from completion/effort; streak counts scheduled days; 1 freeze per week; all deterministic in code. **Consequences:** Stats are reproducible from logs and easy to unit test.

### 013 — MVP scope
**Decision:** Google login, onboarding + disclaimer, weekly AI plan + daily adjustment, daily quest, logger, XP/level/streak, weight chart. Offline sync, PWA install, weekly quests, and badges move to v1.

### 014 — Cancel Progress Photos & AI Chat Coach
**Context:** Maintaining private media storage (progress photos) and free-form conversational coaching adds complexity and safety surface area with low value compared to structured wellness tracking and visual progression. **Decision:** Remove Progress Photos and AI Chat Coach from the roadmap, and drop the unused Supabase Storage dependency. **Consequences:** Simpler security/env surface; all AI interactions remain structured (`generateObject` + Zod + code-enforced safety bounds).

### 015 — Route Consolidation into 4-Tab Bottom Navigation
**Context:** Six bottom nav tabs (`/today`, `/plan`, `/log`, `/body`, `/exercises`, `/profile`) felt fragmented, especially during a workout when switching between today's quest, weekly plan, and set logger. **Decision:** Consolidate into 4 tabs: `Train` (`/today` = Today + Logger + Weekly Plan + Muscle Map), `Calendar` (`/calendar`), `Exercises` (`/exercises` = List + Skill Tree), and `Profile` (`/profile` = Overview + Body + Settings). Redirect `/plan`, `/log` → `/today` and `/body` → `/profile`. **Consequences:** Cleaner mobile navigation and room for the Calendar Wellness Tracker without crowding the bottom bar.

### 016 — Period-Aware AI & Integrated Calendar Wellness Tracker
**Context:** Female users and family members benefit from tracking menstrual cycles, pain symptoms, medications/supplements, and sleep alongside their training streak—and having workouts adapt automatically. **Decision:** Add optional menstrual cycle fields at onboarding for female users (`tracksPeriod`, `lastPeriodStartDate`, `averageCycleDays`, `averagePeriodDays`, `cycleRegularity`) and `daily_wellness_log` / `menstrual_cycle` / `user_wellness_item` tables powering `/calendar`. Feed luteal-anchored cycle phases and wellness logs into AI Weekly Plan and Daily Adjustment while strictly enforcing existing safety bounds and non-medical guardrails. Gate Period and female-specific pain tags (`Cramps`, `Ovulation`, `Breast tenderness`) behind `tracksPeriod`. **Consequences:** More personalized recovery adaptation without cluttering the UI for users who don't track periods.

### 017 — Deterministic Skill Tree Mastery & Exercise Muscle Mapping
**Context:** Users want visual feedback on which muscles they train (Muscle Map/Heatmap) and where they stand on calisthenics progressions (Skill Tree). **Decision:** Store relational muscle weights (`ExerciseMuscle`), mastery benchmarks (`ExerciseMasteryBenchmark`), and DAG edges (`ExerciseEdge`), and compute Skill Tree states (`Locked`, `On going`, `Mastered`) purely in domain code from `SetLog`. **Consequences:** Consistent with the "code counts" principle—mastery states are reproducible, testable, and automatically stay in sync with workout logs.

### 018 — Web Push Reminders via VAPID + Cron Endpoint
**Context:** Consistency improves with timely workout and upcoming-period reminders. **Decision:** Implement standard Web Push using VAPID keys through the existing Serwist Service Worker (`src/sw.ts`), storing subscriptions in `push_subscription` and triggering sends via a `CRON_SECRET`-authenticated `/api/cron/reminders` endpoint that respects `profile.timezone`, `profile.trainingDays`, and H-2 upcoming period opt-in (`periodReminderEnabled`). **Consequences:** Works natively on installed PWAs without third-party push vendors; requires a lightweight external/host cron schedule in production.

### 019 — Relational v2 Domain Schema & 3-Tier DAG Skill Tree
**Context:** Simple array columns and single-parent `progressionNextId` pointers could not represent multi-parent calisthenics prerequisites (e.g., Muscle-Up requiring both Pull-Ups and Dips), weighted 26-region muscle activation, or graduated mastery tiers. **Decision:** Introduce `MenstrualCycle`, `UserWellnessItem`, `ExerciseMuscle`, `ExerciseMasteryBenchmark` (`BRONZE`/`SILVER`/`GOLD`), and `ExerciseEdge` (`PROGRESSION`/`PREREQUISITE`/`ALTERNATIVE`) tables, backed by a 98-exercise modular seed and DAG acyclicity tests. **Consequences:** Enables accurate weighted muscle heatmaps, multi-parent Skill Tree canvas/tier views, and auditable cycle history while keeping legacy array columns populated for backward compatibility.

### 020 — Light/Dark/System Theming & Apple HIG Floating Tab Bar
**Context:** Users requested full dark mode support and a modern native-feeling mobile tab bar consistent with `base-luma` sizing. **Decision:** Adopt `next-themes` (`attribute="class"`, `defaultTheme="system"`) with dynamic `<meta name="theme-color">` sync and high-contrast `.dark` semantic tokens (including distinct hover vs pressed `Toggle`/`ToggleGroup` states), and remodel `BottomNav` into a translucent floating capsule with a `framer-motion` active pill (`useReducedMotion`-aware). **Consequences:** Consistent visual clarity across Light and Dark modes without hand-rolling theme hydration or altering compact `base-luma` control sizes.

### 021 — 3-Tab `/profile` Hub & Permanent Transactional Account Deletion
**Context:** Placing Appearance, Cycle Settings, Push Reminders, Body Tracking, and Account controls on a single `/profile` Overview tab created visual clutter, and users needed a clean way to delete their account and associated data. **Decision:** Split `/profile` into 3 tabs (`Overview`, `Body`, `Settings`), keep Appearance controls exclusively in `/profile` → `Settings`, group Cycle & Push settings into iOS-style rows opening bottom `Sheet`s, and implement `DeleteAccountDialog` + `deleteUserAccountPermanently` (requiring `"DELETE"` confirmation, deleting Better Auth `verification` tokens and `user` with PostgreSQL `ON DELETE CASCADE`, unsubscribing push, and clearing Dexie). **Consequences:** Minimalist Overview tab, centralized settings, and zero orphaned personal data on account deletion.

### 022 — Zero-Dependency MIT-Ported Male/Female 26-Region Anatomical Body Map
**Context:** `react-native-body-highlighter` has clean anatomical silhouettes for both Male and Female bodies, but cannot be installed directly in Next.js web due to `react-native` / `react-native-svg` dependencies and coarser ~16 muscle slugs. **Decision:** Port the MIT-licensed Male and Female SVG paths directly into `src/components/features/muscles/` (`body-map-male.ts`, `body-map-female.ts`) with equalized front/back viewBoxes, subdivide paths with native sub-paths and namespaced `<clipPath>` splits to preserve all 26 `MuscleGroup` regions, auto-select anatomy from `profile.sex`, and add dark-theme OKLCH fills plus pointer-following tooltips and hover outlines. **Consequences:** Zero extra npm dependencies, full 26-region heatmap fidelity for both Male and Female profiles, and full MIT license attribution preserved.

### 023 — Borderless Filterable `/calendar`, Non-Fertility Cycle Phases, and Ongoing-Period Guard
**Context:** Dense borders/outlines and competing cell fills made `/calendar` visually noisy; fertility tracking is outside app scope (non-medical); and logging 1–2 days of an ongoing period previously overwrote `profile.averagePeriodDays` and wiped out remaining predicted period days. **Decision:** Remove `isFertileWindow` across engine, UI, and i18n while keeping all 4 cycle phases (`menstrual`, `follicular`, `ovulatory`, `luteal`); remodel `MonthlyCalendarPanel` and the synced Week Strip to be borderless with day fills reserved strictly for Workout done / Streak freeze; keep `Predicted period` always visible while toggling confirmed `Period`, `Pain`, `Supplements`, and `Medication` via borderless multi-select filter badges with enlarged mini icons; guard `computeRollingCycleAverages` and `recomputeCycleLengthsAndProfileAverages` against shrinking averages from ongoing partial episodes; and hydrate Redo Onboarding from existing `Profile` + `BodyMetric` with proper `revalidatePath`. **Consequences:** High-readability calendar in both themes, reliable ongoing & future period predictions, and safe Redo Onboarding without stale cache or lost cycle dates.

### 024 — Gemini 3.8 Flash Fallback Chain, AI SDK v7 `Output.object`, Wire Schemas & AI Plan Retry
**Context:** Relying on a single retired model (`gemini-2.5-flash`) and deep structured Zod schemas led to timeouts and transient structured-output failures, while rule-based fallback weekly plans offered no way to retry AI generation once capacity recovered. **Decision:** Migrate to AI SDK v7 `generateText` + `Output.object({ schema })` across `AI_MODEL_CHAIN` (`gemini-3.8-flash` `30s` → `gemini-3.1-flash-lite` `20s` → `gemini-3.5-flash-lite` `20s`, `maxRetries: 0` per attempt) using lightweight Gemini wire schemas normalized into domain Zod schemas, and add a `"Regenerate with AI"` retry action (`retryWeeklyPlanWithAiAction`) on fallback weekly plans. **Consequences:** Higher AI generation reliability across weekly plans, daily check-ins, and grounded search discovery, with one-tap recovery when a fallback plan was created.

### 025 — 18 Zero-Equipment Never-Trained Foundations & Global-Tier Skill Tree Layout
**Context:** Users starting with zero training background (`Never trained`) needed safe, zero-equipment regression paths anchored cleanly at the base of each Skill Tree without distorting cross-tier DAG readability. **Decision:** Add 18 zero-equipment foundation exercises (`prisma/seed-data/foundations.ts`) and 31 DAG edges (`116` total exercises, `506` muscle mappings, `348` mastery benchmarks, `121` edges), and switch `skill-tree-layout.ts` to global-tier compaction so entry-level skills anchor the lowest bottom-up tier per path. **Consequences:** Smooth progression onboarding for absolute beginners while keeping all movement paths compact and acyclic.

### 026 — Card-Only UI Surface System (Style 4), ReUI `TimePicker`, and Batch Body Measurements with Collapsible History
**Context:** Nesting ReUI `Frame` wrappers around cards created double-border noise and inconsistent padding/icon symmetry across mobile views, while native `<input type="time">` varied across browsers and separate single-field Body Measurement tabs felt fragmented. **Decision:** Migrate all feature surfaces to a **Card-Only UI** (`<Card size="sm">` outer containers with `rounded-2xl bg-muted/50` borderless tonal sub-tiles and iOS-style grouped settings rows while retaining `src/components/reui/frame.tsx` unused), make Exercise List pattern tabs non-scrollable full-width, standardize time picking on 24h ReUI `TimePicker` (Sleep Duration and Push Reminders), batch `WAIST`/`CHEST`/`ARM` logging atomically, and place *Recent entries* / *Measurement history* inside a shared `MetricHistoryCollapsible`. **Consequences:** Clean Apple Health–inspired visual hierarchy, symmetric alignment, consistent 24h time UX, and streamlined body tracking.

### 027 — v2.5 Consistency & Adherence Dashboard in `/profile?tab=metrics` & Chart Palette Upgrade
**Context:** Adding a 5th route to the Apple HIG floating `BottomNav` would crowd mobile touch targets, while the original `base-luma` `--chart-2..4` tokens lacked sufficient contrast for multi-series Light/Dark charts. **Decision:** Add a 4th non-scrollable sub-tab `Metrics` inside `/profile` (`Overview | Metrics | Body | Settings`), compute all Consistency & Adherence metrics (`7D / 30D / 90D / All`, period-over-period deltas, adaptive daily/weekly/monthly buckets, 12-week activity grid, Mon–Sun adherence breakdown) deterministically without schema changes via `src/lib/metrics/consistency.ts` sharing `evaluateStreakHistory()`, wrap Recharts views in a `ResizeObserver` `MeasuredChartBox` so hidden tabs never emit `width(-1)` warnings, and upgrade `--chart-2..5` in `globals.css` while preserving `--chart-1` verbatim for `WeightTrendChart`. **Consequences:** Zero DB migration, instant client-side timeframe filtering, identical streak/freeze numbers across `/today`, `/calendar`, and `/profile?tab=metrics`, and high-contrast multi-series charts in Light and Dark themes.
