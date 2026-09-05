-- CreateTable
CREATE TABLE "personal_data_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "document_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_data_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_data_consents_user_id_idx" ON "personal_data_consents"("user_id");

-- AddForeignKey
ALTER TABLE "personal_data_consents" ADD CONSTRAINT "personal_data_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
