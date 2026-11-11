import Link from "next/link";
import type { AuthUserDto } from "@portal/shared-types";

/** Se muestra en /login y /register cuando ya hay una sesión iniciada. */
export function AlreadySignedIn({ user }: { user: AuthUserDto }) {
  return (
    <div role="status" className="rounded-lg border border-foreground/10 p-4">
      <p className="font-medium">Ya iniciaste sesión como {user.name}.</p>
      <Link
        href={user.role === "ADMIN" ? "/admin" : "/properties"}
        className="mt-2 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {user.role === "ADMIN" ? "Ir al panel de administración" : "Ver propiedades"}
      </Link>
    </div>
  );
}
