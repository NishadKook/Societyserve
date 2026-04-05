-- AlterTable
ALTER TABLE "services" ADD COLUMN     "monthlyPrice" DECIMAL(10,2),
ADD COLUMN     "schedule" JSONB,
ADD COLUMN     "trialPrice" DECIMAL(10,2);
