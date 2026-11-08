export type NavigationItem = {
  label: string;
  href: string;
};

export const publicNavigationItems: readonly NavigationItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Propiedades", href: "/properties" },
  { label: "Comprar", href: "/properties?operation=SALE" },
  { label: "Arrendar", href: "/properties?operation=RENT" },
  { label: "Ingresar", href: "/login" },
];

/**
 * Un enlace está activo cuando su ruta coincide con la actual.
 * Los enlaces con query string (Comprar/Arrendar) comparten ruta con
 * "Propiedades", por lo que nunca se marcan como activos.
 */
export function isNavigationItemActive(
  currentPathname: string,
  itemHref: string,
): boolean {
  if (itemHref.includes("?")) return false;
  if (itemHref === "/") return currentPathname === "/";
  return (
    currentPathname === itemHref || currentPathname.startsWith(`${itemHref}/`)
  );
}
