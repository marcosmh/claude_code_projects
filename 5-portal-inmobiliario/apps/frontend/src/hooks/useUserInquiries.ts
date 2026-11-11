"use client";

import useSWR, { useSWRConfig } from "swr";
import {
  buildUserInquiriesUrl,
  deleteInquiry,
  fetchUserInquiries,
  userInquiriesUrl,
  type UserInquiriesQuery,
} from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Página de consultas enviadas por la persona con sesión (6 por página, con búsqueda).
 * Sin sesión no consulta. `refresh` revalida todas las páginas en caché (p. ej. tras enviar una
 * consulta nueva); `remove` elimina una consulta propia y las revalida (lanza si la API falla).
 */
export function useUserInquiries(query: UserInquiriesQuery = {}) {
  const { user } = useCurrentUser();
  const { mutate: mutateMatching } = useSWRConfig();
  const { data } = useSWR(user ? buildUserInquiriesUrl(query) : null, fetchUserInquiries, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });

  const refresh = () =>
    mutateMatching((key) => typeof key === "string" && key.startsWith(userInquiriesUrl));

  return {
    inquiries: data?.items,
    page: data?.page,
    totalPages: data?.totalPages,
    total: data?.total,
    refresh,
    async remove(inquiryId: string) {
      await deleteInquiry(inquiryId);
      await refresh();
    },
  };
}
