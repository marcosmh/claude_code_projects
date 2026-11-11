export type NavigationItem = {
  label: string;
  href: string;
};

/** Acceso a la cuenta: en el header se muestra como botón destacado, aparte del menú. */
export const loginNavigationItem: NavigationItem = {
  label: "Ingresar",
  href: "/login",
};

export const publicNavigationItems: readonly NavigationItem[] = [
  { label: "Inicio", href: "/portal" },
  { label: "Propiedades", href: "/properties" },
  { label: "Comprar", href: "/properties?operation=SALE" },
  { label: "Arrendar", href: "/properties?operation=RENT" },
  loginNavigationItem,
];

/** Enlaces del menú del header: todos los públicos salvo el botón de ingreso. */
export const headerMenuItems: readonly NavigationItem[] = publicNavigationItems.filter(
  (item) => item !== loginNavigationItem,
);

/**
 * Un enlace está activo cuando su ruta coincide con la actual.
 * Los enlaces con query string (Comprar/Arrendar) comparten ruta con
 * "Propiedades", por lo que nunca se marcan como activos.
 */
export function isNavigationItemActive(currentPathname: string, itemHref: string): boolean {
  if (itemHref.includes("?")) return false;
  return currentPathname === itemHref || currentPathname.startsWith(`${itemHref}/`);
}
