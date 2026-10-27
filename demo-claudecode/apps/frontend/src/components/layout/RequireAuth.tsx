import { Navigate, Outlet, useLocation } from "react-router";
import { ErrorState } from "@/components/common/ErrorState";
import { useSession } from "@/hooks/useAuth";

/** Ruta protegida: sin sesión redirige a /login y recuerda a dónde quería ir el usuario. */
export function RequireAuth() {
  const location = useLocation();
  const { data: user, isPending, isError, refetch } = useSession();

  if (isPending) {
    return (
      <p role="status" className="p-8 text-zinc-600">
        Comprobando la sesión…
      </p>
    );
  }
  if (isError) {
    return <ErrorState message="No se pudo comprobar tu sesión. Revisa tu conexión." onRetry={() => void refetch()} />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}
