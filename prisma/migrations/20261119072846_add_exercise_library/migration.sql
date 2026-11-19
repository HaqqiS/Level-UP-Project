-- CreateEnum
CREATE TYPE "MovementPattern" AS ENUM ('PUSH', 'PULL', 'LEGS', 'CORE', 'SKILL', 'MOBILITY');

-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('REPS', 'SECONDS');

-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('SEED', 'AI');

-- CreateEnum
CREATE TYPE "AiUsageKind" AS ENUM ('WEEKLY', 'DAILY', 'DISCOVERY');

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" "MovementPattern" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "equipment" TEXT[],
    "measure" "ExerciseMeasure" NOT NULL DEFAULT 'REPS',
    "cues" TEXT[],
    "contraindications" TEXT[],
    "progressionNextId" TEXT,
    "status" "ExerciseStatus" NOT NULL DEFAULT 'VERIFIED',
    "source" "ExerciseSource" NOT NULL DEFAULT 'SEED',
    "sourceUrl" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AiUsageKind" NOT NULL,
    "date" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_slug_key" ON "exercise"("slug");

-- CreateIndex
CREATE INDEX "exercise_pattern_status_difficulty_idx" ON "exercise"("pattern", "status", "difficulty");

-- CreateIndex
CREATE INDEX "ai_usage_userId_kind_date_idx" ON "ai_usage"("userId", "kind", "date");

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_progressionNextId_fkey" FOREIGN KEY ("progressionNextId") REFERENCES "exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
