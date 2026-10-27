-- CreateEnum
CREATE TYPE "SellerReviewContactType" AS ENUM ('DEAL_CONFIRMED', 'CONTACT');

-- CreateEnum
CREATE TYPE "SellerReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'PENDING');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "rating_average" DOUBLE PRECISION,
ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "contact_type" "SellerReviewContactType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" "SellerReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "seller_reply" TEXT,
    "seller_reply_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seller_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "seller_reviews_weight_check" CHECK ("weight" > 0),
    CONSTRAINT "seller_reviews_not_self_check" CHECK ("seller_id" <> "author_id")
);

-- CreateIndex
CREATE INDEX "seller_reviews_seller_id_status_created_at_idx" ON "seller_reviews"("seller_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "seller_reviews_author_id_created_at_idx" ON "seller_reviews"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "seller_reviews_conversation_id_idx" ON "seller_reviews"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_reviews_author_id_seller_id_key" ON "seller_reviews"("author_id", "seller_id");

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
