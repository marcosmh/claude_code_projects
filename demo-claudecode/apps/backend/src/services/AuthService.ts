import { createHash, randomUUID } from "node:crypto";
import type { AuthRepository } from "../repositories/AuthRepository";
import type { AuthIdentity, AuthUser, UserRole } from "../types";
import { consoleAudit, type AuditLogger } from "../utils/audit";
import { ConflictError, RefreshReplayInGraceError, UnauthorizedError, ValidationError } from "../utils/errors";
import {
  InvalidTokenError,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type AccessClaims,
  type JwtConfig,
  type RefreshClaims,
} from "../utils/jwt";
import { decoyHash, hashPassword, needsRehash, verifyPassword } from "../utils/password";

/** Consecutive failures that lock an account, and for how long. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

// One message for every login failure (unknown email, wrong password, locked account): the response
// must not reveal which accounts exist or which are locked. The lockout rule is stated up front instead.
const LOGIN_FAILED = `Email o contraseña incorrectos. Tras ${MAX_FAILED_LOGINS} intentos fallidos la cuenta se bloquea ${LOCK_MS / 60_000} minutos.`;
const NOT_SIGNED_IN = "Inicia sesión para continuar";
const TOKEN_EXPIRED = "La sesión ha caducado, inicia sesión de nuevo";
// Every refresh failure (bad signature, unknown, expired, reused, user gone) answers the same.
const REFRESH_FAILED = "Sesión no válida, inicia sesión de nuevo";

/** What a login or a refresh hands out: the access token for the body and the refresh token for its cookie. */
export interface SessionTokens {
  /** Access token (JWT) for the `Authorization: Bearer` header. */
  token: string;
  refreshToken: string;
  /** Seconds the refresh cookie should live (the time left to the session's expiry). */
  refreshMaxAgeSeconds: number;
  user: AuthUser;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const isLocked = (user: { lockedUntil: Date | null }, now: Date) => user.lockedUntil !== null && user.lockedUntil > now;
const toAuthUser = ({ id, email, role }: AuthUser): AuthUser => ({ id, email, role });

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    /** A getter so the configuration is validated on first use, not when the module is imported. */
    private readonly config: () => JwtConfig,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
    private readonly audit: AuditLogger = consoleAudit,
  ) {}

  async login(email: string, password: string): Promise<SessionTokens> {
    const record = await this.repository.findUserByEmail(email);
    const now = this.now();
    const lockUntil = new Date(now.getTime() + LOCK_MS);
    // The attempt is reserved atomically BEFORE the (slow) password check. Reading the lock first and
    // verifying afterwards let N parallel logins all see "not locked", all be verified, and a right password
    // among them get in before the failures were counted. A reservation caps the checks at MAX_FAILED_LOGINS.
    const reserved = record ? await this.repository.reserveLoginAttempt(record.id, MAX_FAILED_LOGINS, lockUntil, now) : false;
    // Always verify (against a decoy when the email is unknown or the account is locked) so every failure costs the same.
    const valid = await verifyPassword(password, record?.passwordHash ?? (await decoyHash()));
    if (!record) {
      this.audit("login_failed", { reason: "unknown_account" });
      throw new UnauthorizedError(LOGIN_FAILED);
    }
    // A locked account rejects even the right password and does not count the attempt.
    if (!reserved) {
      this.audit("login_locked", { userId: record.id });
      throw new UnauthorizedError(LOGIN_FAILED);
    }
    if (!valid) {
      await this.repository.settleFailedLogin(record.id, MAX_FAILED_LOGINS, lockUntil);
      this.audit("login_failed", { userId: record.id, reason: "wrong_password" });
      throw new UnauthorizedError(LOGIN_FAILED);
    }
    // Conditional on "not locked": if concurrent wrong guesses locked the account meanwhile, the right one fails too.
    if (!(await this.repository.completeLogin(record.id, now))) {
      this.audit("login_locked", { userId: record.id, reason: "locked_during_login" });
      throw new UnauthorizedError(LOGIN_FAILED);
    }
    await this.rehashIfWeak(record.id, password, record.passwordHash);
    await this.repository.deleteExpiredRefreshTokens(now);
    const family = this.newId();
    const refreshExpiresAt = new Date(now.getTime() + this.config().refreshTtlSeconds * 1000);
    const refreshJti = this.newId();
    await this.repository.createRefreshToken({
      tokenHash: hashToken(refreshJti),
      family,
      userId: record.id,
      expiresAt: refreshExpiresAt,
    });
    this.audit("login_success", { userId: record.id });
    return this.issue(record, { jti: refreshJti, family }, refreshExpiresAt, now);
  }

  /**
   * Trades a refresh token for a new access token and a rotated refresh token. A refresh token that was
   * already used (or revoked) means it leaked or was replayed: its whole family is revoked. The refresh
   * token keeps the expiry of its family, so a session lasts JWT_REFRESH_EXPIRES_IN from login.
   * Every failure is the same generic 401.
   */
  async refresh(refreshToken: string | null): Promise<SessionTokens> {
    const now = this.now();
    const claims = await this.verifyRefresh(refreshToken, now);
    const stored = await this.repository.findRefreshToken(hashToken(claims.jti));
    if (!stored || stored.family !== claims.family) {
      // Validly signed but unknown to us (e.g. the database was reset): nothing of it may keep working.
      await this.repository.revokeRefreshTokenFamily(claims.family, now);
      return this.refreshDenied("unknown_token");
    }
    if (stored.revokedAt) return this.reuseDetected(stored, now);
    if (stored.expiresAt <= now) return this.refreshDenied("expired", stored.userId);

    const identity = await this.repository.findAuthIdentity(stored.userId);
    // A lockout only blocks new logins: whoever knows an email can trigger it, so it must not end sessions that
    // are already open (the rotation below proves possession of a live refresh token, which a guesser lacks).
    if (!identity) {
      await this.repository.revokeRefreshTokenFamily(stored.family, now);
      return this.refreshDenied("unknown_user", stored.userId);
    }

    const nextJti = this.newId();
    const rotated = await this.repository.rotateRefreshToken(
      stored.tokenHash,
      { tokenHash: hashToken(nextJti), family: stored.family, userId: stored.userId, expiresAt: stored.expiresAt },
      now,
    );
    if (!rotated) {
      // Lost a race against another use of the same token: same as a replay, judged by when the winner rotated.
      const current = await this.repository.findRefreshToken(stored.tokenHash);
      return this.reuseDetected(current ?? stored, now, "concurrent_rotation");
    }
    this.audit("refresh_success", { userId: stored.userId });
    return this.issue(identity, { jti: nextJti, family: stored.family }, stored.expiresAt, now);
  }

  /**
   * Resolves an access token to its user, or throws 401. Checks signature, algorithm, exp, iss, aud, then
   * that the user still exists and still has the token's `ver` (a password change bumps it; a login lockout does not
   * touch open sessions, since anyone who knows the email can trigger it), and
   * that the session (the refresh family in `sid`) was not revoked: logout, reuse detection and a password change
   * on another device cut the access token at once instead of letting it live out its 15 minutes.
   * Two reads in parallel (user by primary key, family by index); role and email come from the user, not the token.
   */
  async authenticate(accessToken: string | null): Promise<AuthUser> {
    if (!accessToken) throw new UnauthorizedError(NOT_SIGNED_IN);
    const now = this.now();
    let claims: AccessClaims;
    try {
      claims = await verifyAccessToken(this.config(), accessToken, now);
    } catch (error) {
      throw new UnauthorizedError(error instanceof InvalidTokenError && error.expired ? TOKEN_EXPIRED : NOT_SIGNED_IN);
    }
    const [identity, sessionLive] = await Promise.all([
      this.repository.findAuthIdentity(claims.userId),
      this.repository.isRefreshFamilyLive(claims.sessionId, now),
    ]);
    if (!identity || !sessionLive || identity.tokenVersion !== claims.version) {
      throw new UnauthorizedError(NOT_SIGNED_IN);
    }
    return toAuthUser(identity);
  }

  /**
   * Changes the password of a signed-in user. Bumps the token version (every live access token dies, the
   * caller's included: its next request renews through the refresh token) and revokes every refresh token
   * except the family of the caller's own. A wrong current password counts as a failed login, so a stolen
   * session cannot be used to guess it indefinitely.
   */
  async changePassword(userId: number, refreshToken: string | null, current: string, next: string): Promise<void> {
    const record = await this.repository.findUserById(userId);
    if (!record) throw new UnauthorizedError(NOT_SIGNED_IN);

    const now = this.now();
    const valid = await verifyPassword(current, record.passwordHash);
    if (isLocked(record, now) || !valid) {
      if (!isLocked(record, now)) {
        await this.repository.registerFailedLogin(record.id, MAX_FAILED_LOGINS, new Date(now.getTime() + LOCK_MS));
      }
      this.audit("password_change_failed", { userId, reason: "wrong_current_password" });
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
    await this.repository.incrementTokenVersion(record.id);
    const keepFamily = await this.ownFamily(userId, refreshToken, now);
    if (keepFamily) await this.repository.revokeOtherRefreshTokens(userId, keepFamily, now);
    else await this.repository.revokeAllRefreshTokens(userId, now);
    this.audit("password_changed", { userId });
  }

  /** Revokes the whole family of the refresh token. Idempotent: a missing or invalid token is a no-op. */
  async logout(refreshToken: string | null): Promise<void> {
    const now = this.now();
    let claims: RefreshClaims;
    try {
      claims = await this.verifyRefresh(refreshToken, now);
    } catch {
      return;
    }
    const stored = await this.repository.findRefreshToken(hashToken(claims.jti));
    if (!stored) return;
    await this.repository.revokeRefreshTokenFamily(stored.family, now);
    this.audit("logout", { userId: stored.userId });
  }

  /**
   * Creates an account (used by the user:create script; there is no public sign-up).
   * The first account inherits the invoices that predate authentication.
   */
  async createUser(
    email: string,
    password: string,
    role: UserRole = "USER",
  ): Promise<{ user: AuthUser; claimedInvoices: number }> {
    if (await this.repository.findUserByEmail(email)) {
      throw new ConflictError("Ya existe un usuario con ese email");
    }
    const isFirst = (await this.repository.countUsers()) === 0;
    const created = await this.repository.createUser({ email, passwordHash: await hashPassword(password), role });
    const claimedInvoices = isFirst ? await this.repository.claimOrphanInvoices(created.id) : 0;
    return { user: toAuthUser(created), claimedInvoices };
  }

  /**
   * After a verified login, upgrades a hash made with weaker scrypt parameters. Best effort: a failure is
   * audited and never breaks the login. It does not touch tokenVersion or any token (the password is the same),
   * and it only writes if the stored hash is still the one that was verified, so it cannot overwrite a password
   * changed concurrently.
   */
  private async rehashIfWeak(userId: number, password: string, storedHash: string): Promise<void> {
    if (!needsRehash(storedHash)) return;
    try {
      const updated = await this.repository.updatePasswordHash(userId, await hashPassword(password), storedHash);
      this.audit("password_rehashed", { userId, ...(!updated && { reason: "hash_changed_meanwhile" }) });
    } catch {
      this.audit("password_rehash_failed", { userId });
    }
  }

  private async issue(
    identity: AuthIdentity,
    refresh: RefreshClaims,
    refreshExpiresAt: Date,
    now: Date,
  ): Promise<SessionTokens> {
    const config = this.config();
    const [token, refreshToken] = await Promise.all([
      signAccessToken(
        config,
        { userId: identity.id, role: identity.role, version: identity.tokenVersion, sessionId: refresh.family },
        this.newId(),
        now,
      ),
      signRefreshToken(config, refresh, now, refreshExpiresAt),
    ]);
    const refreshMaxAgeSeconds = Math.max(0, Math.floor((refreshExpiresAt.getTime() - now.getTime()) / 1000));
    return { token, refreshToken, refreshMaxAgeSeconds, user: toAuthUser(identity) };
  }

  private async verifyRefresh(refreshToken: string | null, now: Date): Promise<RefreshClaims> {
    if (!refreshToken) throw new UnauthorizedError(REFRESH_FAILED);
    try {
      return await verifyRefreshToken(this.config(), refreshToken, now);
    } catch {
      this.audit("refresh_failed", { reason: "invalid_token" });
      throw new UnauthorizedError(REFRESH_FAILED);
    }
  }

  /**
   * A revoked refresh token came back. If it was ROTATED (replacedBy set) less than the grace window ago, it
   * is most likely a second tab or a lost response: plain 401, no new tokens (a replay must never get any),
   * family untouched. Anything else (outside the window, or revoked by logout/password change/lockout) is
   * treated as theft: the whole family is revoked and the event audited.
   */
  private async reuseDetected(
    stored: { tokenHash: string; family: string; userId: number; revokedAt: Date | null; replacedBy: number | null },
    now: Date,
    reason?: string,
  ): Promise<never> {
    const graceMs = this.config().refreshReuseGraceSeconds * 1000;
    const rotatedAt = stored.replacedBy !== null ? stored.revokedAt : null;
    if (graceMs > 0 && rotatedAt && now.getTime() - rotatedAt.getTime() <= graceMs) {
      this.audit("refresh_reuse_grace", { userId: stored.userId, ...(reason && { reason }) });
      throw new RefreshReplayInGraceError(REFRESH_FAILED);
    }
    await this.repository.revokeRefreshTokenFamily(stored.family, now);
    this.audit("refresh_reuse_detected", { userId: stored.userId, ...(reason && { reason }) });
    throw new UnauthorizedError(REFRESH_FAILED);
  }

  private refreshDenied(reason: string, userId?: number): never {
    this.audit("refresh_failed", { userId, reason });
    throw new UnauthorizedError(REFRESH_FAILED);
  }

  /** Family of the caller's own refresh token, if it is valid, live and theirs. */
  private async ownFamily(userId: number, refreshToken: string | null, now: Date): Promise<string | null> {
    if (!refreshToken) return null;
    try {
      const claims = await verifyRefreshToken(this.config(), refreshToken, now);
      const stored = await this.repository.findRefreshToken(hashToken(claims.jti));
      const live = stored && stored.userId === userId && !stored.revokedAt && stored.expiresAt > now;
      return live ? stored.family : null;
    } catch {
      return null;
    }
  }
}
