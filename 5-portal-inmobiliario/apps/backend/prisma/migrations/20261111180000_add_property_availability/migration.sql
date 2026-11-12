-- CreateEnum
CREATE TYPE "PropertyAvailability" AS ENUM ('AVAILABLE', 'SOLD', 'RENTED');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "availability" "PropertyAvailability" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "properties_isPublished_availability_idx" ON "properties"("isPublished", "availability");
