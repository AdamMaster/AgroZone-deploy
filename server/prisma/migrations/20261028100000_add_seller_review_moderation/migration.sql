-- CreateEnum
CREATE TYPE "SellerReviewFilterFlag" AS ENUM ('PROFANITY', 'LINK', 'PHONE', 'REPEATED_TEXT');

-- CreateEnum
CREATE TYPE "SellerReviewReportReason" AS ENUM ('FAKE', 'ABUSIVE', 'SPAM', 'PERSONAL_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "SellerReviewReportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_REVIEW_HIDDEN';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_REVIEW_PUBLISHED';

-- AlterTable
ALTER TABLE "seller_reviews" ADD COLUMN     "filter_flags" "SellerReviewFilterFlag"[] DEFAULT ARRAY[]::"SellerReviewFilterFlag"[],
ADD COLUMN     "moderated_at" TIMESTAMP(3),
ADD COLUMN     "moderated_by_id" TEXT;

-- CreateTable
CREATE TABLE "seller_review_reports" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" "SellerReviewReportReason" NOT NULL,
    "comment" TEXT,
    "status" "SellerReviewReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_review_reports_review_id_status_idx" ON "seller_review_reports"("review_id", "status");

-- CreateIndex
CREATE INDEX "seller_review_reports_reporter_id_created_at_idx" ON "seller_review_reports"("reporter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "seller_review_reports_review_id_reporter_id_key" ON "seller_review_reports"("review_id", "reporter_id");

-- CreateIndex
CREATE INDEX "seller_reviews_status_created_at_idx" ON "seller_reviews"("status", "created_at");

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_review_reports" ADD CONSTRAINT "seller_review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "seller_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_review_reports" ADD CONSTRAINT "seller_review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
