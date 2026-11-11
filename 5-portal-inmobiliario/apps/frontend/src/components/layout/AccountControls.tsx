"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFavorites } from "@/hooks/useFavorites";
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
  const { favorites } = useFavorites();
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
      router.push(user.role === "ADMIN" ? "/login" : "/");
    };

    return (
      <div className={cn("flex items-center gap-3", isMobile && "justify-between")}>
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onNavigate}
            aria-current={isNavigationItemActive(currentPathname, "/admin") ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold text-link hover:underline",
              focusClassName,
            )}
          >
            Administración
          </Link>
        )}
        {user.role === "USER" && favorites !== undefined && (
          <Link
            href="/account"
            onClick={onNavigate}
            aria-label={`Mis favoritas: ${favorites.length}`}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold tabular-nums hover:bg-foreground/5",
              focusClassName,
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={cn(
                "size-5",
                favorites.length > 0 ? "fill-danger text-danger" : "fill-none",
              )}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.5 3.4 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
            </svg>
            <span aria-hidden="true">{favorites.length}</span>
          </Link>
        )}
        {user.role === "ADMIN" ? (
          <span title={user.name} className="max-w-24 truncate text-sm font-medium xl:max-w-40">
            {user.name}
          </span>
        ) : (
          <Link
            href="/account"
            aria-current={isNavigationItemActive(currentPathname, "/account") ? "page" : undefined}
            title={user.name}
            onClick={onNavigate}
            className={cn(
              "max-w-24 truncate rounded-md xl:max-w-40 text-sm font-medium hover:underline",
              focusClassName,
            )}
          >
            <span className="sr-only">Mi cuenta: </span>
            {user.name}
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5",
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
