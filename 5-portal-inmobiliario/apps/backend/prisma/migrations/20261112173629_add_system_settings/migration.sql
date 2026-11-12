-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'MXN',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
