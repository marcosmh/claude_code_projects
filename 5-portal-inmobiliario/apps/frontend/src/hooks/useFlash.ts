"use client";

import { useFlashStore } from "@/stores/flashStore";

/** Emite mensajes flash desde cualquier componente (se muestran arriba, spec §57). */
export function useFlash() {
  const show = useFlashStore((state) => state.show);
  return {
    success: (text: string) => show("success", text),
    error: (text: string) => show("error", text),
    info: (text: string) => show("info", text),
  };
}
