-- CreateEnum
CREATE TYPE "CycleRegularity" AS ENUM ('REGULAR', 'IRREGULAR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WellnessItemKind" AS ENUM ('SUPPLEMENT', 'MEDICATION');

-- CreateEnum
CREATE TYPE "MuscleRole" AS ENUM ('PRIMARY', 'SECONDARY', 'STABILIZER');

-- CreateEnum
CREATE TYPE "MasteryTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "ProgressionEdgeKind" AS ENUM ('PROGRESSION', 'PREREQUISITE', 'ALTERNATIVE');

-- AlterTable
ALTER TABLE "daily_wellness_log" ADD COLUMN     "crampSeverity" INTEGER,
ADD COLUMN     "energyLevel" INTEGER,
ADD COLUMN     "hydrationMl" INTEGER,
ADD COLUMN     "moodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "painDetails" JSONB,
ADD COLUMN     "painSeverity" INTEGER,
ADD COLUMN     "sleepQuality" INTEGER,
ADD COLUMN     "stressLevel" INTEGER;

-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "branchKey" TEXT,
ADD COLUMN     "treeTier" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "cycleRegularity" "CycleRegularity" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "lutealPhaseDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "periodReminderEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "menstrual_cycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "cycleLengthDays" INTEGER,
    "periodLengthDays" INTEGER,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wellness_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "WellnessItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wellness_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscle" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "role" "MuscleRole" NOT NULL,
    "activationWeight" INTEGER NOT NULL,

    CONSTRAINT "exercise_muscle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_mastery_benchmark" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "tier" "MasteryTier" NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetSeconds" INTEGER,
    "minConsecutiveSessions" INTEGER NOT NULL DEFAULT 1,
    "maxRpe" INTEGER,
    "tempo" TEXT,
    "formStandard" TEXT,
    "unlocksNext" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exercise_mastery_benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_edge" (
    "id" TEXT NOT NULL,
    "fromExerciseId" TEXT NOT NULL,
    "toExerciseId" TEXT NOT NULL,
    "kind" "ProgressionEdgeKind" NOT NULL DEFAULT 'PROGRESSION',
    "branchLabel" TEXT,
    "requiredTier" "MasteryTier" NOT NULL DEFAULT 'BRONZE',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exercise_edge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menstrual_cycle_userId_startDate_idx" ON "menstrual_cycle"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_cycle_userId_startDate_key" ON "menstrual_cycle"("userId", "startDate");

-- CreateIndex
CREATE INDEX "user_wellness_item_userId_kind_isActive_idx" ON "user_wellness_item"("userId", "kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_wellness_item_userId_kind_slug_key" ON "user_wellness_item"("userId", "kind", "slug");

-- CreateIndex
CREATE INDEX "exercise_muscle_muscleGroup_role_idx" ON "exercise_muscle"("muscleGroup", "role");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_muscle_exerciseId_muscleGroup_key" ON "exercise_muscle"("exerciseId", "muscleGroup");

-- CreateIndex
CREATE INDEX "exercise_mastery_benchmark_exerciseId_idx" ON "exercise_mastery_benchmark"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_mastery_benchmark_exerciseId_tier_key" ON "exercise_mastery_benchmark"("exerciseId", "tier");

-- CreateIndex
CREATE INDEX "exercise_edge_fromExerciseId_idx" ON "exercise_edge"("fromExerciseId");

-- CreateIndex
CREATE INDEX "exercise_edge_toExerciseId_idx" ON "exercise_edge"("toExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_edge_fromExerciseId_toExerciseId_key" ON "exercise_edge"("fromExerciseId", "toExerciseId");

-- AddForeignKey
ALTER TABLE "menstrual_cycle" ADD CONSTRAINT "menstrual_cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wellness_item" ADD CONSTRAINT "user_wellness_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscle" ADD CONSTRAINT "exercise_muscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_mastery_benchmark" ADD CONSTRAINT "exercise_mastery_benchmark_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_edge" ADD CONSTRAINT "exercise_edge_fromExerciseId_fkey" FOREIGN KEY ("fromExerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_edge" ADD CONSTRAINT "exercise_edge_toExerciseId_fkey" FOREIGN KEY ("toExerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
