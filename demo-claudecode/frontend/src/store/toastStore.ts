import { create } from "zustand";

export type ToastType = "success" | "error";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Máximo de avisos a la vez: al llegar uno más se descarta el más antiguo, para no tapar la pantalla. */
export const MAX_TOASTS = 3;

/** Mensajes flash globales: viven en el store, así sobreviven a la navegación entre páginas. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => set((s) => ({ toasts: [...s.toasts, { id: nextId++, type, message }].slice(-MAX_TOASTS) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
