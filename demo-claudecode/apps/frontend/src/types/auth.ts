import type { SessionBodyDto } from "@invoices/shared-types";

export type { AuthUser, UserRole } from "@invoices/shared-types";

/** Cuerpo de `/auth/login` y `/auth/refresh`: el usuario. Los tokens viajan solo en cookies httpOnly. */
export type AuthSession = SessionBodyDto;
