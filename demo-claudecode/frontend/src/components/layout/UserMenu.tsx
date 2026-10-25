import { button } from "@/components/common/ui";
import { useLogout, useSession } from "@/hooks/useAuth";

export function UserMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-zinc-600 sm:inline" title={user.email}>
        {user.email}
      </span>
      <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className={button("secondary", "sm")}>
        Cerrar sesión
      </button>
    </div>
  );
}
