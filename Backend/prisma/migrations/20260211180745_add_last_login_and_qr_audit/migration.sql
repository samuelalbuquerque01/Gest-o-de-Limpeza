/*
  Warnings:

  - The values [SUPERVISOR] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnu
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CLEANER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLEANER';
COMMIT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "qrGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "qrGeneratedBy" TEXT,
ADD COLUMN     "qrVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Room_qrCode_idx" ON "Room"("qrCode");
