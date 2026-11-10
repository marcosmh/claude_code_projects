"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/cn";
import { isNavigationItemActive, loginNavigationItem } from "@/lib/navigation";

type AccountControlsProps = {
  variant: "desktop" | "mobile";
  /** Cierra el menú móvil al navegar. */
  onNavigate?: () => void;
};

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Botón Ingresar para visitantes; nombre y Cerrar sesión cuando hay sesión iniciada. */
export function AccountControls({ variant, onNavigate }: AccountControlsProps) {
  const router = useRouter();
  const currentPathname = usePathname();
  const { user, isLoading, setUser } = useCurrentUser();
  const isMobile = variant === "mobile";

  if (isLoading) {
    // Reserva el espacio mientras se consulta la sesión para que el header no salte.
    return (
      <div
        aria-hidden="true"
        className={cn("h-10 rounded-md bg-foreground/5", isMobile ? "h-11 w-full" : "w-24")}
      />
    );
  }

  if (user) {
    const signOut = async () => {
      try {
        await logoutUser();
      } catch {
        // Si falla la petición, la sesión sigue activa y el botón permanece visible.
        return;
      }
      await setUser(null);
      onNavigate?.();
      router.push("/");
    };

    return (
      <div className={cn("flex items-center gap-3", isMobile && "justify-between")}>
        <Link
          href="/account"
          aria-current={isNavigationItemActive(currentPathname, "/account") ? "page" : undefined}
          title={user.name}
          onClick={onNavigate}
          className={cn(
            "max-w-40 truncate rounded-md text-sm font-medium hover:underline",
            focusClassName,
          )}
        >
          <span className="sr-only">Mi cuenta: </span>
          {user.name}
        </Link>
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "inline-flex items-center rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5",
            isMobile ? "h-11" : "h-10",
            focusClassName,
          )}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  const isLoginActive = isNavigationItemActive(currentPathname, loginNavigationItem.href);
  return (
    <Link
      href={loginNavigationItem.href}
      onClick={onNavigate}
      aria-current={isLoginActive ? "page" : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover",
        isMobile ? "h-11 w-full text-base" : "ml-1 h-10 text-sm",
        focusClassName,
      )}
    >
      {loginNavigationItem.label}
    </Link>
  );
}
