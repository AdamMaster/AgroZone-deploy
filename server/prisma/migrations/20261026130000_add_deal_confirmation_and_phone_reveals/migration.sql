-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "deal_confirmed_at" TIMESTAMP(3);

-- Перенос прежнего флага (он нигде не устанавливался, но данные не теряем).
UPDATE "conversations" SET "deal_confirmed_at" = "updated_at" WHERE "deal_confirmed";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "deal_confirmed";

-- CreateTable
CREATE TABLE "ad_phone_reveals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "ad_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_phone_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_phone_reveals_user_id_seller_id_created_at_idx" ON "ad_phone_reveals"("user_id", "seller_id", "created_at");

-- CreateIndex
CREATE INDEX "ad_phone_reveals_seller_id_idx" ON "ad_phone_reveals"("seller_id");

-- CreateIndex
CREATE INDEX "ad_phone_reveals_ad_id_idx" ON "ad_phone_reveals"("ad_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_phone_reveals_user_id_ad_id_key" ON "ad_phone_reveals"("user_id", "ad_id");

-- AddForeignKey
ALTER TABLE "ad_phone_reveals" ADD CONSTRAINT "ad_phone_reveals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_phone_reveals" ADD CONSTRAINT "ad_phone_reveals_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_phone_reveals" ADD CONSTRAINT "ad_phone_reveals_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
