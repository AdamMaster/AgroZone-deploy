-- AlterEnum
ALTER TYPE "PushProvider" ADD VALUE 'FCM';

-- AlterTable
ALTER TABLE "push_devices" ADD COLUMN "installation_id" TEXT;

-- CreateIndex
CREATE INDEX "push_devices_installation_id_idx" ON "push_devices"("installation_id");
