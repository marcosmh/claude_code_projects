import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { useToastStore } from "@/store/toastStore";
import type { AuthUser } from "@/types/auth";
import { queryKeys } from "./queryKeys";

/** Descarta todo lo cacheado salvo la sesión: los datos de un usuario no deben verse desde otra cuenta. */
export function dropUserData(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] });
}

/** Marca la sesión como terminada: las rutas protegidas redirigen al inicio de sesión. */
export function endSession(queryClient: QueryClient) {
  dropUserData(queryClient);
  queryClient.setQueryData<AuthUser | null>(queryKeys.session, null);
}

/** Usuario de la sesión: `null` si no hay sesión, `undefined` mientras se comprueba. */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => authService.me(signal),
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authService.login(email, password),
    onSuccess: (user) => {
      dropUserData(queryClient);
      queryClient.setQueryData<AuthUser | null>(queryKeys.session, user);
    },
  });
}

export function useChangePassword() {
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword),
    onSuccess: () => push("success", "Contraseña actualizada. Se cerró la sesión en tus otros dispositivos."),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: () => authService.logout(),
    // El token local ya se borró aunque el backend no respondiera: la sesión termina siempre en este dispositivo.
    onSettled: () => endSession(queryClient),
    onError: () =>
      push(
        "error",
        "Cerraste la sesión aquí, pero el servidor no pudo revocarla. No se restaurará automáticamente en este navegador; vuelve a iniciar sesión cuando quieras.",
      ),
  });
}
