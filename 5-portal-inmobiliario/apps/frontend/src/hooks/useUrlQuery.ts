"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/** Interpreta `page` como entero positivo; cualquier otro valor equivale a la página 1. */
export function parsePageParam(value: string): number {
  const parsedPage = Number.parseInt(value, 10);
  return Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
}

/**
 * Estado de una lista (página, búsqueda y filtros) guardado en los query params de la URL.
 * Los valores iguales al valor por defecto se omiten para mantener la URL corta.
 */
export function useUrlQuery<Keys extends string>(defaults: Record<Keys, string>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // router.replace es asíncrono: dos cambios seguidos partirían de la URL anterior y el segundo
  // borraría el primero. Se recuerda lo último escrito hasta que la URL real lo refleja.
  const pendingQueryRef = useRef<string | null>(null);
  const currentQuery = searchParams.toString();
  useEffect(() => {
    pendingQueryRef.current = null;
  }, [currentQuery]);

  const values = {} as Record<Keys, string>;
  for (const key of Object.keys(defaults) as Keys[]) {
    values[key] = searchParams.get(key) ?? defaults[key];
  }

  const update = useCallback(
    (changes: Partial<Record<Keys, string>>) => {
      const nextParams = new URLSearchParams(pendingQueryRef.current ?? currentQuery);
      for (const key of Object.keys(changes) as Keys[]) {
        const nextValue = changes[key];
        if (nextValue === undefined || nextValue === defaults[key]) nextParams.delete(key);
        else nextParams.set(key, nextValue);
      }
      const queryString = nextParams.toString();
      pendingQueryRef.current = queryString;
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    // `defaults` es un objeto literal estable por lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, router, currentQuery],
  );

  return { values, update };
}

/** Si la página pedida supera el total (p. ej. tras borrar el último registro), vuelve a la última. */
export function useClampPage(
  page: number,
  totalPages: number | undefined,
  goToPage: (lastPage: number) => void,
) {
  useEffect(() => {
    if (totalPages !== undefined && totalPages >= 1 && page > totalPages) goToPage(totalPages);
  }, [page, totalPages, goToPage]);
}
