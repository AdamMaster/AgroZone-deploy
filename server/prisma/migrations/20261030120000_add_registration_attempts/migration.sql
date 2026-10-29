-- CreateEnum
CREATE TYPE "RegistrationChannel" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "RegistrationPlatform" AS ENUM ('SITE', 'APP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RegistrationAttemptStatus" AS ENUM ('IN_PROGRESS', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RegistrationAttemptStep" AS ENUM ('STARTED', 'CONFIRMATION_SENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RegistrationFailureReason" AS ENUM ('ALREADY_REGISTERED', 'PROVIDER_ERROR', 'CODE_INVALID', 'CODE_EXPIRED', 'CALL_NOT_RECEIVED', 'LINK_EXPIRED', 'INVALID_DATA', 'UNKNOWN_ERROR');

-- CreateTable
CREATE TABLE "registration_attempts" (
    "id" TEXT NOT NULL,
    "channel" "RegistrationChannel" NOT NULL,
    "contact" TEXT NOT NULL,
    "platform" "RegistrationPlatform" NOT NULL DEFAULT 'UNKNOWN',
    "status" "RegistrationAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "step" "RegistrationAttemptStep" NOT NULL DEFAULT 'STARTED',
    "failure_reason" "RegistrationFailureReason",
    "failure_detail" TEXT,
    "failures_count" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "user_agent" TEXT,
    "device" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_attempts_status_updated_at_idx" ON "registration_attempts"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "registration_attempts_channel_contact_updated_at_idx" ON "registration_attempts"("channel", "contact", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "registration_attempts_updated_at_idx" ON "registration_attempts"("updated_at");

-- AddForeignKey
ALTER TABLE "registration_attempts" ADD CONSTRAINT "registration_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
