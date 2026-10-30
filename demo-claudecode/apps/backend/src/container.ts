import { AuthController } from "./controllers/AuthController";
import { InvoiceController } from "./controllers/InvoiceController";
import { StatsController } from "./controllers/StatsController";
import { createWithAuth, createWithRole } from "./middleware/withAuth";
import { auditRepository, authRepository, invoiceRepository } from "./repositories";
import type { AuthRepository } from "./repositories/AuthRepository";
import type { InvoiceRepository } from "./repositories/InvoiceRepository";
import { AuthService } from "./services/AuthService";
import { ReactPdfRenderer } from "./pdf/ReactPdfRenderer";
import { InvoicePdfService } from "./services/InvoicePdfService";
import { InvoiceService } from "./services/InvoiceService";
import { StatsService } from "./services/StatsService";
import { createAlerter, createDefaultSink, lockoutThresholdFromEnv } from "./utils/alert";
import { combineAudit, consoleAudit, persistentAudit, type AuditLogger } from "./utils/audit";
import { getJwtConfig, type JwtConfig } from "./utils/jwt";

/** Composition root: wires Repository -> Service -> Controller. */
export function createContainer(
  repository: InvoiceRepository,
  auth: AuthRepository,
  now: () => Date = () => new Date(),
  jwtConfig: () => JwtConfig = getJwtConfig,
  audit: AuditLogger = consoleAudit,
) {
  const invoiceService = new InvoiceService(repository, now);
  const authService = new AuthService(auth, jwtConfig, now, undefined, audit);
  const withAuth = createWithAuth((token) => authService.authenticate(token));
  return {
    authService,
    authController: new AuthController(authService),
    invoiceController: new InvoiceController(invoiceService, new InvoicePdfService(invoiceService, new ReactPdfRenderer())),
    statsController: new StatsController(new StatsService(repository, now)),
    withAuth,
    withRole: createWithRole(withAuth),
  };
}

// Security trail: stdout line + database row + alerts (stderr, and a webhook when AUDIT_ALERT_WEBHOOK_URL is set).
const securityAudit = combineAudit(
  consoleAudit,
  persistentAudit(auditRepository),
  createAlerter(createDefaultSink(), { lockoutThreshold: lockoutThresholdFromEnv() }),
);

export const container = createContainer(invoiceRepository, authRepository, undefined, undefined, securityAudit);
