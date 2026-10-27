import { useEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router";

/** Tras navegar, mueve el foco al contenedor para que teclado y lector de pantalla empiecen en la nueva página. */
export function useRouteFocus(target: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  // Se compara con la ruta anterior (no con una bandera) para que el doble efecto de StrictMode no enfoque en la carga inicial.
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    target.current?.focus({ preventScroll: true });
  }, [pathname, target]);
}
