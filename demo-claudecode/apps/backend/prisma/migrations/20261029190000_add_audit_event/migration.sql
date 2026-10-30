-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- Same defense in depth as the other tables: reachable only through Prisma, closed to the Data API roles.
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
