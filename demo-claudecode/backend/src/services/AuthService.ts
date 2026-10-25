import { createHash, randomBytes } from "node:crypto";
import type { AuthRepository } from "../repositories/AuthRepository";
import type { AuthUser } from "../types";
import { ConflictError, UnauthorizedError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    const valid = await verifyPassword(password, record?.passwordHash ?? (await decoy()));
    // One message for "no such user" and "wrong password": the response must not reveal which.
    if (!record || !valid) throw new UnauthorizedError("Email o contraseña incorrectos");

    const now = this.now();
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
