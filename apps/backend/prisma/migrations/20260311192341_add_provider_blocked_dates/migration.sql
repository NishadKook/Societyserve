-- CreateTable
CREATE TABLE "provider_blocked_dates" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_blocked_dates_providerId_date_key" ON "provider_blocked_dates"("providerId", "date");

-- AddForeignKey
ALTER TABLE "provider_blocked_dates" ADD CONSTRAINT "provider_blocked_dates_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
