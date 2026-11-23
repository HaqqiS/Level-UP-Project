-- CreateEnum
CREATE TYPE "RankTier" AS ENUM ('F', 'E', 'D', 'C', 'B', 'A', 'S');

-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE 'MASTERY';

-- AlterTable
ALTER TABLE "achievement" ADD COLUMN     "titleReward" TEXT;

-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "equippedTitleKey" TEXT,
ADD COLUMN     "rankTier" "RankTier" NOT NULL DEFAULT 'F',
ADD COLUMN     "tierLevel" INTEGER NOT NULL DEFAULT 1;
