import { createHash, randomBytes } from "node:crypto";
import type { AuthRepository } from "../repositories/AuthRepository";
import type { AuthUser } from "../types";
import { ConflictError, UnauthorizedError, ValidationError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Consecutive failures that lock an account, and for how long. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

// One message for every login failure (unknown email, wrong password, locked account): the response
// must not reveal which accounts exist or which are locked. The lockout rule is stated up front instead.
const LOGIN_FAILED = `Email o contraseña incorrectos. Tras ${MAX_FAILED_LOGINS} intentos fallidos la cuenta se bloquea ${LOCK_MS / 60_000} minutos.`;

export interface LoginResult {
  token: string;
  user: AuthUser;
  expiresAt: Date;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Verified when the email is unknown so that a miss costs as much as a wrong password.
let decoyHash: Promise<string> | undefined;
const decoy = () => (decoyHash ??= hashPassword(randomBytes(16).toString("hex")));

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(32).toString("base64url"),
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const record = await this.repository.findUserByEmail(email);
    // Always verify (against a decoy when the email is unknown) so every failure costs the same.
    const valid = await verifyPassword(password, record?.passwordHash ?? (await decoy()));
    const now = this.now();
    if (!record) throw new UnauthorizedError(LOGIN_FAILED);
    // A locked account rejects even the right password and does not count the attempt.
    if (this.isLocked(record, now)) throw new UnauthorizedError(LOGIN_FAILED);
    if (!valid) {
      await this.repository.registerFailedLogin(record.id, MAX_FAILED_LOGINS, new Date(now.getTime() + LOCK_MS));
      throw new UnauthorizedError(LOGIN_FAILED);
    }

    await this.repository.clearLoginFailures(record.id);
    await this.repository.deleteExpiredSessions(now);
    const token = this.newToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.repository.createSession({ tokenHash: hashToken(token), userId: record.id, expiresAt });
    return { token, user: { id: record.id, email: record.email }, expiresAt };
  }

  /** Resolves the session token to its user, or throws 401. */
  async authenticate(token: string | null): Promise<AuthUser> {
    if (!token) throw new UnauthorizedError("Inicia sesión para continuar");
    const tokenHash = hashToken(token);
    const session = await this.repository.findSession(tokenHash);
    if (!session) throw new UnauthorizedError("Inicia sesión para continuar");
    if (session.expiresAt <= this.now()) {
      await this.repository.deleteSession(tokenHash);
      throw new UnauthorizedError("La sesión ha caducado, inicia sesión de nuevo");
    }
    return session.user;
  }

  /**
   * Changes the password of a signed-in user and revokes all their other sessions (the one in use
   * stays). A wrong current password counts as a failed login, so a stolen session cannot be used
   * to guess it indefinitely.
   */
  async changePassword(userId: number, token: string | null, current: string, next: string): Promise<number> {
    const record = await this.repository.findUserById(userId);
    if (!record || !token) throw new UnauthorizedError("Inicia sesión para continuar");

    const now = this.now();
    const valid = await verifyPassword(current, record.passwordHash);
    if (this.isLocked(record, now) || !valid) {
      if (!this.isLocked(record, now)) {
        await this.repository.registerFailedLogin(record.id, MAX_FAILED_LOGINS, new Date(now.getTime() + LOCK_MS));
      }
      throw new ValidationError("No se pudo cambiar la contraseña", [
        { field: "currentPassword", message: "La contraseña actual no es correcta" },
      ]);
    }
    if (current === next) {
      throw new ValidationError("No se pudo cambiar la contraseña", [
        { field: "newPassword", message: "La nueva contraseña debe ser distinta de la actual" },
      ]);
    }
    await this.repository.updatePassword(record.id, await hashPassword(next));
    return this.repository.deleteOtherSessions(record.id, hashToken(token));
  }

  private isLocked(user: { lockedUntil: Date | null }, now: Date): boolean {
    return user.lockedUntil !== null && user.lockedUntil > now;
  }

  async logout(token: string | null): Promise<void> {
    if (token) await this.repository.deleteSession(hashToken(token));
  }

  /**
   * Creates an account (used by the user:create script; there is no public sign-up).
   * The first account inherits the invoices that predate authentication.
   */
  async createUser(email: string, password: string): Promise<{ user: AuthUser; claimedInvoices: number }> {
    if (await this.repository.findUserByEmail(email)) {
      throw new ConflictError("Ya existe un usuario con ese email");
    }
    const isFirst = (await this.repository.countUsers()) === 0;
    const created = await this.repository.createUser({ email, passwordHash: await hashPassword(password) });
    const claimedInvoices = isFirst ? await this.repository.claimOrphanInvoices(created.id) : 0;
    return { user: { id: created.id, email: created.email }, claimedInvoices };
  }
}
