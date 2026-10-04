-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('ACCOUNT_REGISTERED', 'ACCOUNT_CREATED_BY_ADMIN', 'ACCOUNT_DELETED', 'LOGIN_NEW_DEVICE', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'PASSWORD_SET_BY_ADMIN', 'EMAIL_CHANGE_REQUESTED', 'EMAIL_CHANGED', 'EMAIL_SET_BY_ADMIN', 'PHONE_ADDED', 'PHONE_CHANGED', 'PRIMARY_PHONE_CHANGED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'OAUTH_LINKED', 'ROLE_CHANGED', 'PREMIUM_SET_BY_ADMIN');

-- CreateEnum
CREATE TYPE "SecurityEventActor" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "user_security_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "actor" "SecurityEventActor" NOT NULL DEFAULT 'USER',
    "actor_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_security_events_user_id_created_at_idx" ON "user_security_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_security_events_user_id_type_idx" ON "user_security_events"("user_id", "type");

-- CreateIndex
CREATE INDEX "user_security_events_created_at_idx" ON "user_security_events"("created_at");

-- AddForeignKey
ALTER TABLE "user_security_events" ADD CONSTRAINT "user_security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
