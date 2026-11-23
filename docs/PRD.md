# Product Requirements — Calisthenics Quest

## 1. Problem & Goals

People start calisthenics but quit because programs feel generic and progress feels invisible.

**Goals**
- Make training feel like a game so users stay consistent.
- Give every user a personal, adaptive program regardless of level.
- Make body, wellness, and performance progress measurable and visual.
- Work on a phone like a native app, including offline logging (v1), push reminders (v1.5), and Light/Dark/System themes (v2).

**Non‑goals (for now)**
- Public scale, monetization, or social features (until Later phase).
- Replacing medical, gynecological, or professional coaching advice.
- Fertility tracking or fertile-window prediction (explicitly excluded).
- Gym/weightlifting programs.
- Progress photo storage or conversational AI chat coach (cancelled from roadmap).

## 2. Personas

| Persona | Description | Needs |
|---|---|---|
| **Beginner** | Never trained or long break, maybe overweight | Gentle start, clear form cues, safe regressions, quick wins |
| **Intermediate** | Trains at home with pull‑up/dip bar | Structure, progressive overload, motivation |
| **Advanced** | Chasing skills (muscle‑up, handstand, levers) | Skill progressions, volume management |

Primary users today: the owner and family members.

## 3. User Stories

### Onboarding & Redo Onboarding
- As a new user, I sign in with Google and answer a short, cleanly styled card questionnaire (experience + optional quick self-check with 5s plank step, goals, equipment, training days/week, session length, injuries, height, weight) so the app knows me.
- As a female user, I can optionally enable **Menstrual Cycle Tracking** at onboarding (last period start date via ReUI date picker, average cycle length default `28` days, average period duration default `5` days, cycle regularity) so the planner can adapt training load to my cycle.
- As a returning user redoing onboarding from `/profile`, the wizard starts cleanly at Step 1 pre-filled with my current profile, measurements, and cycle settings without clobbering existing cycle history.
- As a new user, I must accept a health disclaimer before receiving a plan.

### Navigation & Appearance
- As a mobile user, I navigate via a floating translucent Apple HIG–inspired 4-tab bottom bar (`Train`, `Calendar`, `Exercises`, `Profile`).
- As a user, I can switch between **Light**, **Dark**, and **System** themes exclusively from `/profile` → `Settings`, with high-contrast semantic colors across all controls and visualizations.

### Unified Train Hub (`Today + Logger + Weekly Plan` at `/today`)
- As a user, I access today's quests, daily check‑in, weekly plan overview, workout logger, and muscle heatmap from a single **Train** hub (`/today`) without jumping across separate tabs.
- Legacy routes (`/plan`, `/log`) redirect cleanly to `/today`.

### Weekly Plan (AI)
- As a user, I get a 7‑day plan that matches my level, equipment, schedule, and—when enabled—my predicted menstrual cycle phase (`menstrual`, `follicular`, `ovulatory`, `luteal`) and recent wellness logs.
- As a user, each new week's plan is slightly more advanced based on what I actually logged.

### Daily Check‑in & Wellness Adaptation (AI)
- As a user, before training I report energy, soreness, and available time—and today's session automatically considers both my check‑in and my daily wellness log (period flow, pain, medications, sleep duration & readiness).
- During menstrual phase or heavy symptoms/poor sleep, the AI lowers intensity/volume and prioritizes mobility or recovery within strict safety bounds.
- As a user, if the AI fails, I still get the planned session.

### Quests, Gamification & Push Reminders
- As a user, I see today's quest (session + 1–2 side quests) and weekly quests, and earn XP when I complete them.
- As a user, I level up, keep a streak, and rest days don't break it.
- As a user, I can clearly see and use one streak freeze per week (polished freeze indicator & interaction).
- As a user, I can opt in to **Push Reminders** in `/profile` → `Settings` so I get a Web Push notification on my scheduled training days if I haven't logged a session yet, plus optional H-2 upcoming period reminders when cycle tracking is enabled.

### Workout Logger & Anatomical Muscle Map / Heatmap
- As a user, I log sets, reps, or duration per exercise quickly with one hand, even offline (synced automatically when back online without UI flicker); the exercise accordion advances to the next exercise only after completing all target sets of the current exercise.
- As a user, I see a front & back **26-region Anatomical Muscle Map / Heatmap** (`Primary`, `Secondary`, `Untargeted`) on `/today` that automatically adapts to Male or Female anatomy (`profile.sex`), supports hover tooltips/outlines, toggles between `Logged` and `Planned` modes across `Today` / `Weekly` / `30 Days` scopes, and opens a `MuscleBreakdownSheet` on tap.

### Exercise Library & 3-Tier DAG Skill Tree (`/exercises`)
- As a user, I can browse 98 curated calisthenics exercises in a list view, inspect exercise details with an anatomical target-muscle preview, and see an `"unverified"` warning on AI-discovered exercises.
- As a user, I can switch to an interactive **Skill Tree** (dot-grid pan/zoom canvas or tier list) per movement pattern (`Pull`, `Push`, `Legs`, `Core`, `Skill`, `Mobility`) showing each progression node's deterministic status (`Locked`, `On going`, `Mastered`) and 3-tier mastery benchmarks (`Bronze`, `Silver`, `Gold`) based on my logged workouts.

### Calendar Wellness Tracker (`/calendar`)
- As a user, I view a clean borderless monthly calendar + synced 7-day week strip where:
  - Day cell backgrounds are reserved for **Workout done** and **Streak freeze** (plus active selection).
  - **Predicted period** days always remain visible (outline droplet icon) when cycle tracking is enabled, without showing any fertile window, while cycle phase badges (`Menstrual`, `Follicular`, `Ovulatory`, `Luteal`) guide recovery awareness.
  - Borderless multi-select filter badges (**Period**, **Pain**, **Supplements**, **Medication**) toggle enlarged colored mini icons below each date for fast visual scanning.
- Below the calendar, debounced auto-save cards let me log:
  - **Period Tracker** (`Light`, `Medium`, `Heavy`, `Super heavy` + cramp intensity) and **Cycle History** sheet — visible only when Period Tracking is enabled
  - **Pain Tracker** (`Pain free`, `Cramps`, `Ovulation`, `Breast tenderness`, `Headache`, `Migraine`, `Migraine with aura`, `Lower back`, `Leg`, `Joint` + severity) — female-specific tags visible only when Period Tracking is enabled
  - **Supplements** & **Medications** (presets + custom archivable items)
  - **Sleep Duration** (`sleep time` – `wake up time`, auto-computed duration + sleep quality)
  - **Readiness & Notes** (energy, stress, mood tags, hydration, daily notes)

### Profile & Body Tracking (`/profile`)
- As a user, I navigate a clean 3-tab **Profile** hub (`/profile`):
  - **Overview:** compact identity card + Achievements grid.
  - **Body:** weight log, 30d/90d trend chart, and body measurements (`WAIST`/`CHEST`/`ARM`).
  - **Settings:** Appearance theme selector (`Light`/`Dark`/`System`), iOS-style grouped Preferences (Cycle & Period sheet, Push Reminders sheet), Account actions (Redo onboarding, Sign out), and a Danger Zone **Delete account** flow that permanently erases all account data (PostgreSQL cascade + browser push unsubscribe + offline IndexedDB clear).
- Legacy route (`/body`) redirects cleanly to `/profile?tab=body`.

## 4. Scope by Phase

| Phase | Status | Features |
|---|---|---|
| **MVP** | Done | Google login · onboarding + disclaimer · AI weekly plan · daily check‑in + AI adjust · daily quest · workout logger · XP/level/streak (basic) · weight log + chart · exercise library (seed + AI discovery) · EN UI with i18n structure |
| **v1** | Done | Offline logging + sync (Dexie) · PWA (Serwist, manifest, icons, install prompt) · weekly quests · badges/achievements · body measurements (`WAIST`, `CHEST`, `ARM`) |
| **v1.5** | Done | Route consolidation (`Today + Plan + Log` → `/today`, `Body + Profile` → `/profile`, 4-tab Bottom Nav) · onboarding card refinement · streak freeze UI polish · Push reminders (Web Push VAPID + scheduled cron) |
| **v2** | Done | Relational v2 schema · period-aware onboarding & AI planner (luteal-anchored cycle phases, H-2 push reminders, no fertile window) · borderless filterable Calendar wellness tracker (`/calendar`) with debounced auto-save, custom items & cycle history · 26-region Male/Female MIT anatomical Muscle Map (`Logged`/`Planned`, `Today`/`Weekly`/`30d`, hover tooltip & breakdown sheet) · 98-exercise 3-tier (`Bronze`/`Silver`/`Gold`) DAG Skill Tree · Light/Dark/System theme (`next-themes`) · Apple HIG floating tab bar · 3-tab `/profile` hub + permanent Delete Account |
| **v2.5** | Planned | Dashboard metrics *(to be designed next)* |
| **Later** | Planned | Indonesian localization (`messages/id.json` + language switcher) · data export (JSON/CSV) · exercise videos · social/leaderboard · production deployment |

## 5. Acceptance Criteria

### MVP & v1 (Delivered)
- **Auth & Onboarding:** Unauthenticated users redirect to sign‑in (Google only); plan generation is blocked until onboarding and disclaimer are complete.
- **Weekly Plan:** Covers exact chosen training days; references only eligible `exercise` IDs; advances ≤ 1 progression step/movement and ≤ 10% weekly volume; retries once on invalid Zod output, then uses rule‑based fallback.
- **Daily Adjustment:** Max 1 AI adjustment/user/day; volume stays within **−40% / +15%**; timeout (> 15 s) or error falls back to planned session.
- **Exercise Library:** `unverified` exercises show a warning label and are excluded for beginners.
- **Gamification:** XP, level, and streak are computed deterministically in server code from logs; rest days never reset streaks; 1 freeze per ISO week.
- **Logger, Offline & Body:** Set logged in ≤ 2 taps; offline queue persists in Dexie and syncs idempotently; weight renders on 30d/90d line chart; measurements (`WAIST`, `CHEST`, `ARM`) supported.

### v1.5 (Delivered)
- **Navigation & Consolidation:** Bottom Nav uses 4 tabs (`Train` `/today`, `Calendar` `/calendar`, `Exercises` `/exercises`, `Profile` `/profile`). Legacy `/plan`, `/log`, and `/body` redirect cleanly without broken links.
- **Onboarding & Streak Polish:** Onboarding cards follow consistent ReUI styling; streak freeze state and weekly availability are clearly surfaced in UI.
- **Push Reminders:** Users can enable/disable Web Push notifications and pick a preferred reminder time in `/profile` → `Settings`; `/api/cron/reminders` (protected by `CRON_SECRET`) sends reminders on scheduled `trainingDays` when today's session is incomplete, plus H-2 period reminders when opted in.

### v2 (Delivered)
- **Period-Aware Onboarding & AI:** Optional menstrual cycle fields appear only for female users; luteal-anchored cycle phases (`menstrual`, `follicular`, `ovulatory`, `luteal`, with no fertile window) and daily wellness logs inform AI Weekly Plan and Daily Adjustment within safety bounds (`−40% / +15%` daily, `≤ 10%` weekly). Ongoing partial period logs never shrink configured `averagePeriodDays`, and Redo Onboarding hydrates existing profile/cycle state cleanly.
- **Calendar Wellness Tracker:** One daily wellness log per user per date with debounced auto-save; Period section and female-specific pain tags are hidden unless Period Tracking is enabled; sleep duration calculates across midnight; borderless calendar grid reserves cell backgrounds for Workout done / Streak freeze, keeps Predicted period always visible, and toggles confirmed Period / Pain / Supplements / Medication indicators via clickable filter badges.
- **Anatomical Muscle Map / Heatmap:** 98 seeded exercises map onto 26 relational muscle groups (`ExerciseMuscle`); Male/Female front & back SVG models auto-select from `profile.sex`, render `Primary`, `Secondary`, and `Untargeted` intensities across `Logged`/`Planned` modes and `Today`/`Weekly`/`30d` scopes, and provide hover tooltips, outlines, and tap-to-inspect `MuscleBreakdownSheet`.
- **3-Tier DAG Skill Tree:** Node states (`Locked`, `On going`, `Mastered`) and `Bronze`/`Silver`/`Gold` mastery tiers are computed deterministically from `SetLog`, `ExerciseMasteryBenchmark`, and `ExerciseEdge`; interactive pan/zoom canvas and tier list open `ExerciseDetailSheet`.
- **Theme, Navigation & Account Lifecycle:** Light/Dark/System themes work across all views with exclusive theme toggle in `/profile` → `Settings`; floating Apple HIG bottom tab bar adapts cleanly to both themes; permanent Delete Account requires typing `"DELETE"`, unsubscribes Web Push, deletes all user data transactionally in PostgreSQL, clears Dexie offline data, and signs out.

## 6. Health & Safety

- Mandatory disclaimer at onboarding and in settings.
- Injuries/limitations filter out contraindicated exercises.
- Pain feedback in check‑in and Calendar Wellness Tracker reduces volume and avoids affected areas.
- Menstrual cycle, pain, medication, supplement, and sleep tracking are strictly for personal logging and conservative workout load adaptation — **never** medical diagnosis, fertility tracking, or clinical advice.
- No medical claims in AI output (enforced via prompt + content check).

## 7. Success Metrics (personal scale)

- Family members train ≥ 3×/week for 4 consecutive weeks.
- Measurable progression (e.g. rep max or skill tree mastery step) per user each month.
