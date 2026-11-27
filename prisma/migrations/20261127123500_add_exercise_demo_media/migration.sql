-- AlterTable
ALTER TABLE "exercise" ADD COLUMN "demoVideoId" TEXT, ADD COLUMN "demoImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
