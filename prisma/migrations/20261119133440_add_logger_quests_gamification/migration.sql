-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('DAILY', 'SIDE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('SESSION', 'QUEST', 'STREAK', 'BADGE');

-- CreateTable
CREATE TABLE "workout_log" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedSessionId" TEXT,
    "date" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_log" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "seconds" INTEGER,
    "rpe" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 1,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestStatus" NOT NULL DEFAULT 'PENDING',
    "date" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "XpSource" NOT NULL,
    "amount" INTEGER NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "freezesAvailable" INTEGER NOT NULL DEFAULT 1,
    "freezeWeekKey" TEXT,
    "lastActiveDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_log_clientId_key" ON "workout_log"("clientId");

-- CreateIndex
CREATE INDEX "workout_log_userId_completedAt_idx" ON "workout_log"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workout_log_userId_date_key" ON "workout_log"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "set_log_clientId_key" ON "set_log"("clientId");

-- CreateIndex
CREATE INDEX "set_log_exerciseId_idx" ON "set_log"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "set_log_workoutLogId_exerciseId_setNumber_key" ON "set_log"("workoutLogId", "exerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "quest_userId_date_status_idx" ON "quest"("userId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quest_userId_key_date_key" ON "quest"("userId", "key", "date");

-- CreateIndex
CREATE INDEX "xp_event_userId_createdAt_idx" ON "xp_event"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_event_userId_source_refId_key" ON "xp_event"("userId", "source", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_userId_key" ON "user_stats"("userId");

-- AddForeignKey
ALTER TABLE "workout_log" ADD CONSTRAINT "workout_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_log" ADD CONSTRAINT "workout_log_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "planned_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest" ADD CONSTRAINT "quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_event" ADD CONSTRAINT "xp_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
