/*
  Warnings:

  - You are about to drop the column `token` on the `support_guests` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "support_guests_token_key";

-- AlterTable
ALTER TABLE "support_guests" DROP COLUMN "token",
ADD COLUMN     "blocked_at" TIMESTAMP(3);
