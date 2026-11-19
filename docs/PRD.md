# Product Requirements — Calisthenics Quest

## 1. Problem & Goals

People start calisthenics but quit because programs feel generic and progress feels invisible.

**Goals**
- Make training feel like a game so users stay consistent.
- Give every user a personal, adaptive program regardless of level.
- Make body and performance progress measurable.
- Work on a phone like a native app, including offline (v1).

**Non‑goals (for now)**
- Public scale, monetization, or social features.
- Replacing medical or professional coaching advice.
- Gym/weightlifting programs.

## 2. Personas

| Persona | Description | Needs |
|---|---|---|
| **Beginner** | Never trained or long break, maybe overweight | Gentle start, clear form cues, safe regressions, quick wins |
| **Intermediate** | Trains at home with pull‑up/dip bar | Structure, progressive overload, motivation |
| **Advanced** | Chasing skills (muscle‑up, handstand, levers) | Skill progressions, volume management |

Primary users today: the owner and family members.

## 3. User Stories

### Onboarding
- As a new user, I sign in with Google and answer a short questionnaire (experience, goals, equipment, training days/week, session length, injuries, height, weight) so the app knows me.
- As a new user, I must accept a health disclaimer before receiving a plan.

### Weekly Plan (AI)
- As a user, I get a 7‑day plan that matches my level, equipment, and schedule.
- As a user, each new week's plan is slightly more advanced based on what I actually logged.

### Daily Check‑in (AI)
- As a user, before training I report energy, soreness, and available time, and today's session adapts.
- As a user, if the AI fails, I still get the planned session.

### Quests & Gamification
- As a user, I see today's quest (session + 1–2 side quests) and earn XP when I complete it.
- As a user, I level up, keep a streak, and rest days don't break it.
- As a user, I can use one streak freeze per week.

### Workout Logger
- As a user, I log sets, reps, or duration per exercise quickly with one hand.

### Body Tracking
- As a user, I log my weight and see a trend chart.

### Exercise Library
- As a user, I can see exercise details; exercises found by AI show an "unverified" warning.

## 4. Scope by Phase

| Phase | Features |
|---|---|
| **MVP** | Google login · onboarding + disclaimer · AI weekly plan · daily check‑in + AI adjust · daily quest · workout logger · XP/level/streak (basic) · weight log + chart · exercise library (seed + AI discovery) · EN UI with i18n structure |
| **v1** | Offline logging + sync · PWA install prompt · weekly quests · badges · body measurements · streak freeze UI polish |
| **v1.5** | Push reminders · progress photos · AI chat coach (ask & modify program) |
| **Later** | Social/leaderboard · exercise videos · data export · Indonesian localization |

## 5. MVP Acceptance Criteria

**Auth & Onboarding**
- Unauthenticated users are redirected to sign‑in; only Google sign‑in is offered.
- Plan generation is blocked until onboarding and disclaimer are complete.

**Weekly Plan**
- Plan covers exactly the user's chosen training days; other days are rest.
- Every exercise references an existing `exercise` ID available with the user's equipment and not contraindicated by injuries.
- Week‑over‑week, each movement advances at most **one progression step**; total weekly volume increases at most **10%**.
- AI output that fails Zod validation is retried once, then a rule‑based fallback plan is used.

**Daily Adjustment**
- At most one AI adjustment per user per day.
- Adjusted session volume stays within **−40% / +15%** of the planned session.
- On AI failure or timeout (> 15 s), the planned session is shown unchanged.

**Exercise Library**
- `unverified` exercises display a warning label.
- `unverified` exercises are not assigned to users at the beginner level.

**Gamification**
- XP, level, and streak are computed in server code only (never by AI) and are reproducible from logs.
- A scheduled rest day never resets the streak; a missed training day resets it unless a freeze is available.

**Logger & Body**
- A set can be logged in ≤ 2 taps after the exercise is open.
- Weight entries render on a line chart (last 30/90 days).

## 6. Health & Safety

- Mandatory disclaimer at onboarding and in settings.
- Injuries/limitations filter out contraindicated exercises.
- Pain feedback in check‑in reduces volume and avoids affected areas.
- No medical claims in AI output (enforced via prompt + content check).

## 7. Success Metrics (personal scale)

- Family members train ≥ 3×/week for 4 consecutive weeks.
- Measurable progression (e.g. rep max or progression step) per user each month.
