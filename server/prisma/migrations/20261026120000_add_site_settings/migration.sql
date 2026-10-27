-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "site_setting_changes" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "changed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_setting_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_setting_changes_key_created_at_idx" ON "site_setting_changes"("key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "site_setting_changes_created_at_idx" ON "site_setting_changes"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_setting_changes" ADD CONSTRAINT "site_setting_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
