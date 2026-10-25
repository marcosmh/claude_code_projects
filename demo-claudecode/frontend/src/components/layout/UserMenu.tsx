import { Link } from "react-router";
import { button } from "@/components/common/ui";
import { useLogout, useSession } from "@/hooks/useAuth";

export function UserMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-zinc-600 lg:inline" title={user.email}>
        {user.email}
      </span>
      <Link to="/account/password" className="text-sm text-zinc-700 underline-offset-2 hover:underline">
        Cambiar contraseña
      </Link>
      <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className={button("secondary", "sm")}>
        Cerrar sesión
      </button>
    </div>
  );
}
