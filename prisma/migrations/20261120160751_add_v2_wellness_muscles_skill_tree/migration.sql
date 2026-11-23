-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "masteryTargetReps" INTEGER,
ADD COLUMN     "masteryTargetSeconds" INTEGER,
ADD COLUMN     "masteryTargetSets" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "primaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "averageCycleDays" INTEGER NOT NULL DEFAULT 28,
ADD COLUMN     "averagePeriodDays" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lastPeriodStartDate" TEXT,
ADD COLUMN     "tracksPeriod" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "daily_wellness_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "periodFlow" TEXT,
    "painTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supplements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sleepTime" TEXT,
    "wakeTime" TEXT,
    "sleepDurationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_wellness_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_wellness_log_userId_date_idx" ON "daily_wellness_log"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_wellness_log_userId_date_key" ON "daily_wellness_log"("userId", "date");

-- AddForeignKey
ALTER TABLE "daily_wellness_log" ADD CONSTRAINT "daily_wellness_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
