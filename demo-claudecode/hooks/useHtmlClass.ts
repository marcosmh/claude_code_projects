"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/**
 * Lee y cambia una clase de `<html>` (la fija un script inline antes del primer render)
 * y recuerda la preferencia en localStorage.
 */
export function useHtmlClass(className: string, storageKey: string, values: { on: string; off: string }) {
  const active = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains(className),
    () => false,
  );

  const { on, off } = values;
  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains(className);
    document.documentElement.classList.toggle(className, next);
    try {
      localStorage.setItem(storageKey, next ? on : off);
    } catch {}
  }, [className, storageKey, on, off]);

  return [active, toggle] as const;
}
