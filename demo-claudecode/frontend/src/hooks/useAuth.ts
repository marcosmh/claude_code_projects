import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { useToastStore } from "@/store/toastStore";
import type { AuthUser } from "@/types/auth";
import { errorMessage } from "@/utils/apiErrors";
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

export function useLogout() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => endSession(queryClient),
    onError: (error) => push("error", errorMessage(error, "No se pudo cerrar la sesión. Inténtalo de nuevo.")),
  });
}
