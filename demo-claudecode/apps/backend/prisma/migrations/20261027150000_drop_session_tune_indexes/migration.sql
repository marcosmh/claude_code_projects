-- DropIndex
DROP INDEX "Invoice_issueDate_idx";

-- DropIndex
DROP INDEX "Invoice_dueDate_idx";

-- DropIndex
DROP INDEX "Invoice_status_idx";

-- DropIndex
DROP INDEX "Invoice_ownerId_idx";

-- DropIndex
DROP INDEX "RefreshToken_family_idx";

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- CreateIndex
CREATE INDEX "Invoice_ownerId_issueDate_id_idx" ON "Invoice"("ownerId", "issueDate" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Invoice_ownerId_status_idx" ON "Invoice"("ownerId", "status");

-- CreateIndex
CREATE INDEX "RefreshToken_family_revokedAt_expiresAt_idx" ON "RefreshToken"("family", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

