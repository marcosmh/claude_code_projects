import { useEffect } from "react";

/** Sincroniza el título de la pestaña (sistema externo: el DOM). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Facturas`;
  }, [title]);
}
