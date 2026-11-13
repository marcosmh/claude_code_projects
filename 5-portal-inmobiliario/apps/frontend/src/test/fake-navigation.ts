import { useSyncExternalStore } from "react";

/**
 * Doble de `next/navigation` para pruebas: la URL vive en memoria y los componentes se
 * vuelven a renderizar cuando `router.replace` la cambia. Uso:
 * `vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).fakeNavigation)`.
 */
let currentSearch = "";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFakeSearch(search: string) {
  currentSearch = search.replace(/^\?/, "");
  listeners.forEach((listener) => listener());
}

export function getFakeSearch(): string {
  return currentSearch;
}

const router = {
  push: (href: string) => router.replace(href),
  replace: (href: string) => {
    setFakeSearch(href.includes("?") ? href.slice(href.indexOf("?") + 1) : "");
  },
};

export const fakeNavigation = {
  useRouter: () => router,
  usePathname: () => "/lista",
  useSearchParams: () => {
    const search = useSyncExternalStore(subscribe, getFakeSearch, getFakeSearch);
    return new URLSearchParams(search);
  },
};
