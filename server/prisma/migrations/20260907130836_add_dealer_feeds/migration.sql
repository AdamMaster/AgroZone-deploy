/*
  Warnings:

  - A unique constraint covering the columns `[dealer_feed_id,external_id]` on the table `ads` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AdSource" AS ENUM ('MANUAL', 'FEED');

-- CreateEnum
CREATE TYPE "DealerFeedStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DealerTier" AS ENUM ('UP_TO_20', 'UP_TO_100', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "DealerSubscriptionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'CANCELED');

-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "dealer_feed_id" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "feed_raw_data" JSONB,
ADD COLUMN     "feed_source_images" JSONB,
ADD COLUMN     "source" "AdSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "dealer_feeds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DealerFeedStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "subscription_tier" "DealerTier",
    "subscription_until" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "last_sync_items_total" INTEGER,
    "last_sync_items_created" INTEGER,
    "last_sync_items_updated" INTEGER,
    "last_sync_items_removed" INTEGER,
    "last_sync_items_failed" INTEGER,
    "last_sync_item_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_subscriptions" (
    "id" TEXT NOT NULL,
    "dealer_feed_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "DealerTier" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "DealerSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "yookassa_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "dealer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dealer_feeds_user_id_key" ON "dealer_feeds"("user_id");

-- CreateIndex
CREATE INDEX "dealer_feeds_status_idx" ON "dealer_feeds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_subscriptions_yookassa_payment_id_key" ON "dealer_subscriptions"("yookassa_payment_id");

-- CreateIndex
CREATE INDEX "dealer_subscriptions_dealer_feed_id_idx" ON "dealer_subscriptions"("dealer_feed_id");

-- CreateIndex
CREATE INDEX "dealer_subscriptions_user_id_idx" ON "dealer_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "dealer_subscriptions_status_idx" ON "dealer_subscriptions"("status");

-- CreateIndex
CREATE INDEX "ads_dealer_feed_id_idx" ON "ads"("dealer_feed_id");

-- CreateIndex
CREATE UNIQUE INDEX "ads_dealer_feed_id_external_id_key" ON "ads"("dealer_feed_id", "external_id");

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_dealer_feed_id_fkey" FOREIGN KEY ("dealer_feed_id") REFERENCES "dealer_feeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_feeds" ADD CONSTRAINT "dealer_feeds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_subscriptions" ADD CONSTRAINT "dealer_subscriptions_dealer_feed_id_fkey" FOREIGN KEY ("dealer_feed_id") REFERENCES "dealer_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_subscriptions" ADD CONSTRAINT "dealer_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
