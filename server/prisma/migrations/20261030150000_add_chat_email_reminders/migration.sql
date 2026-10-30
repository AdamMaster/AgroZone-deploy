-- AlterTable
ALTER TABLE "users" ADD COLUMN "chat_email_notifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "chat_email_reminders" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_email_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_email_reminders_due_at_idx" ON "chat_email_reminders"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_email_reminders_conversation_id_recipient_id_key" ON "chat_email_reminders"("conversation_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "chat_email_reminders" ADD CONSTRAINT "chat_email_reminders_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_email_reminders" ADD CONSTRAINT "chat_email_reminders_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
