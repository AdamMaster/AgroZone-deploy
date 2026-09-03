-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('AD', 'SUPPORT');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "guest_id" TEXT,
ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'AD',
ALTER COLUMN "buyer_id" DROP NOT NULL,
ALTER COLUMN "seller_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "sender_guest_id" TEXT,
ALTER COLUMN "sender_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "support_guests" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "merged_into_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_guests_token_key" ON "support_guests"("token");

-- CreateIndex
CREATE INDEX "support_guests_merged_into_user_id_idx" ON "support_guests"("merged_into_user_id");

-- CreateIndex
CREATE INDEX "conversations_guest_id_idx" ON "conversations"("guest_id");

-- CreateIndex
CREATE INDEX "conversations_type_last_message_at_idx" ON "conversations"("type", "last_message_at");

-- CreateIndex
CREATE INDEX "messages_sender_guest_id_idx" ON "messages"("sender_guest_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "support_guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_guest_id_fkey" FOREIGN KEY ("sender_guest_id") REFERENCES "support_guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_guests" ADD CONSTRAINT "support_guests_merged_into_user_id_fkey" FOREIGN KEY ("merged_into_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Дописано вручную (Prisma не умеет выразить условные CHECK и partial unique
-- index прямо в schema.prisma, см. комментарий к модели Conversation) —
-- при каждой регенерации миграции через `prisma migrate dev` этот блок
-- нужно переносить в новый файл заново, автоматически он не сохранится.

-- CheckConstraint: ровно один "покупатель" у диалога, и он согласован с
-- типом диалога. AD — buyer_id и seller_id обязательны, guest_id пуст.
-- SUPPORT — seller_id всегда пуст (отвечает любой ADMIN, не привязано к
-- конкретному аккаунту), а из buyer_id/guest_id заполнено ровно одно.
ALTER TABLE "conversations" ADD CONSTRAINT "conversation_participant_check" CHECK (
  (
    "type" = 'AD'
    AND "buyer_id" IS NOT NULL
    AND "seller_id" IS NOT NULL
    AND "guest_id" IS NULL
  )
  OR (
    "type" = 'SUPPORT'
    AND "seller_id" IS NULL
    AND (
      ("buyer_id" IS NOT NULL AND "guest_id" IS NULL)
      OR ("buyer_id" IS NULL AND "guest_id" IS NOT NULL)
    )
  )
);

-- CheckConstraint: у сообщения ровно один отправитель — либо User, либо
-- SupportGuest, никогда оба и никогда ни одного.
ALTER TABLE "messages" ADD CONSTRAINT "message_sender_check" CHECK (
  ("sender_id" IS NOT NULL AND "sender_guest_id" IS NULL)
  OR ("sender_id" IS NULL AND "sender_guest_id" IS NOT NULL)
);

-- Partial unique index: один активный SUPPORT-диалог на залогиненного
-- покупателя — повторное обращение в поддержку должно попадать в тот же
-- тикет, а не плодить дубликаты (тот же принцип, что @@unique([adId,
-- buyerId]) даёт для обычных AD-диалогов, но туда это правило не
-- дотягивается, потому что там adId у всех SUPPORT-диалогов одинаково null).
CREATE UNIQUE INDEX "conversation_support_buyer_unique" ON "conversations" ("buyer_id")
  WHERE "type" = 'SUPPORT' AND "buyer_id" IS NOT NULL;

-- То же самое для анонимного гостя.
CREATE UNIQUE INDEX "conversation_support_guest_unique" ON "conversations" ("guest_id")
  WHERE "type" = 'SUPPORT' AND "guest_id" IS NOT NULL;
