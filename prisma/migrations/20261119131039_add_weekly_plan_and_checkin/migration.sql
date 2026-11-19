-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "weekly_plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "aiModel" TEXT NOT NULL,
    "notes" TEXT,
    "rawJson" JSONB,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_session" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "focus" TEXT NOT NULL,
    "notes" TEXT,
    "isRest" BOOLEAN NOT NULL DEFAULT false,
    "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "baselineVolume" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_exercise" (
    "id" TEXT NOT NULL,
    "plannedSessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetSeconds" INTEGER,
    "restSeconds" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "planned_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_checkin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedSessionId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "energy" INTEGER NOT NULL,
    "soreness" INTEGER NOT NULL,
    "painAreas" TEXT[],
    "minutesAvailable" INTEGER NOT NULL,
    "aiNote" TEXT,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_checkin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_plan_userId_status_idx" ON "weekly_plan"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plan_userId_weekStart_key" ON "weekly_plan"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "planned_session_date_idx" ON "planned_session"("date");

-- CreateIndex
CREATE UNIQUE INDEX "planned_session_weeklyPlanId_dayOfWeek_key" ON "planned_session"("weeklyPlanId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "planned_exercise_plannedSessionId_order_idx" ON "planned_exercise"("plannedSessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkin_plannedSessionId_key" ON "daily_checkin"("plannedSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_checkin_userId_date_key" ON "daily_checkin"("userId", "date");

-- AddForeignKey
ALTER TABLE "weekly_plan" ADD CONSTRAINT "weekly_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_session" ADD CONSTRAINT "planned_session_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_exercise" ADD CONSTRAINT "planned_exercise_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "planned_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_exercise" ADD CONSTRAINT "planned_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkin" ADD CONSTRAINT "daily_checkin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_checkin" ADD CONSTRAINT "daily_checkin_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "planned_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
