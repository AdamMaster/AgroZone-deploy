-- CreateEnum
CREATE TYPE "SellerReportReason" AS ENUM ('PREPAYMENT_SCAM', 'FAKE_AD', 'STOLEN_PHOTOS', 'DIFFERENT_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "SellerReportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SellerSanctionType" AS ENUM ('WARNING', 'ADS_SUSPENDED', 'ADS_RESTORED', 'REVIEWS_HIDDEN');

-- AlterEnum
ALTER TYPE "AdStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_ADS_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'SELLER_ADS_RESTORED';

-- CreateTable
CREATE TABLE "seller_reports" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "ad_id" TEXT,
    "reason" "SellerReportReason" NOT NULL,
    "comment" TEXT,
    "status" "SellerReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "seller_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seller_reports_not_self_check" CHECK ("seller_id" <> "reporter_id")
);

-- CreateTable
CREATE TABLE "seller_sanctions" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "moderator_id" TEXT,
    "type" "SellerSanctionType" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_reports_seller_id_status_idx" ON "seller_reports"("seller_id", "status");

-- CreateIndex
CREATE INDEX "seller_reports_reporter_id_created_at_idx" ON "seller_reports"("reporter_id", "created_at");

-- CreateIndex
CREATE INDEX "seller_reports_status_created_at_idx" ON "seller_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "seller_reports_seller_id_reporter_id_key" ON "seller_reports"("seller_id", "reporter_id");

-- CreateIndex
CREATE INDEX "seller_sanctions_seller_id_created_at_idx" ON "seller_sanctions"("seller_id", "created_at");

-- AddForeignKey
ALTER TABLE "seller_reports" ADD CONSTRAINT "seller_reports_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reports" ADD CONSTRAINT "seller_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reports" ADD CONSTRAINT "seller_reports_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_sanctions" ADD CONSTRAINT "seller_sanctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_sanctions" ADD CONSTRAINT "seller_sanctions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
