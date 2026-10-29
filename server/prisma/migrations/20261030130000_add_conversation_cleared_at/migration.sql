-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "buyer_cleared_at" TIMESTAMP(3),
ADD COLUMN     "seller_cleared_at" TIMESTAMP(3);
