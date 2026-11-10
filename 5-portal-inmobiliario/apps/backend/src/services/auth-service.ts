import { ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { UserRecord, UserRepository } from "@/repositories/user-repository";
import type {
  AuthUserDto,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@portal/shared-types";

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, storedHash: string): Promise<boolean>;
  /** Equipara el tiempo de respuesta cuando el email no existe. */
  spendVerificationTime(password: string): Promise<void>;
};

type AuthServiceDependencies = {
  repository: UserRepository;
  passwordHasher: PasswordHasher;
};

function toAuthUserDto(user: UserRecord): AuthUserDto {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

const invalidCredentialsMessage = "Email o contraseña incorrectos";

export function createAuthService({ repository, passwordHasher }: AuthServiceDependencies) {
  return {
    async register(input: RegisterInput): Promise<AuthUserDto> {
      if ((await repository.findByEmail(input.email)) !== null) {
        throw new ConflictError("Ya existe una cuenta con este email");
      }
      const passwordHash = await passwordHasher.hash(input.password);
      const user = await repository.create({
        email: input.email,
        name: input.name,
        passwordHash,
      });
      return toAuthUserDto(user);
    },

    async login(input: LoginInput): Promise<AuthUserDto> {
      const user = await repository.findByEmail(input.email);
      if (user === null) {
        await passwordHasher.spendVerificationTime(input.password);
        throw new UnauthorizedError(invalidCredentialsMessage);
      }
      if (!(await passwordHasher.verify(input.password, user.passwordHash))) {
        throw new UnauthorizedError(invalidCredentialsMessage);
      }
      // Solo se revela que la cuenta está desactivada a quien conoce la contraseña.
      if (!user.isActive) {
        throw new ForbiddenError("Tu cuenta está desactivada");
      }
      return toAuthUserDto(user);
    },

    /**
     * Actualiza nombre, email y, opcionalmente, la contraseña del propio usuario. Cambiar el email
     * o la contraseña exige la contraseña actual, para que una sesión robada no tome la cuenta.
     */
    async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUserDto> {
      const user = await repository.findById(userId);
      if (user === null || !user.isActive) {
        throw new UnauthorizedError("Sesión no válida");
      }

      const isChangingEmail = input.email !== user.email;
      const isChangingPassword = input.newPassword !== undefined;
      if (isChangingEmail || isChangingPassword) {
        if (input.currentPassword === undefined) {
          throw new ForbiddenError(
            "Ingresa tu contraseña actual para cambiar el email o la contraseña",
          );
        }
        if (!(await passwordHasher.verify(input.currentPassword, user.passwordHash))) {
          throw new ForbiddenError("La contraseña actual no es correcta");
        }
      }
      if (isChangingEmail && (await repository.findByEmail(input.email)) !== null) {
        throw new ConflictError("Ya existe una cuenta con este email");
      }

      const updated = await repository.update(userId, {
        name: input.name,
        email: input.email,
        ...(input.newPassword === undefined
          ? {}
          : { passwordHash: await passwordHasher.hash(input.newPassword) }),
      });
      return toAuthUserDto(updated);
    },

    /** Usuario de una sesión válida. Una cuenta eliminada o desactivada invalida la sesión. */
    async getCurrentUser(userId: string): Promise<AuthUserDto> {
      const user = await repository.findById(userId);
      if (user === null || !user.isActive) {
        throw new UnauthorizedError("Sesión no válida");
      }
      return toAuthUserDto(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
