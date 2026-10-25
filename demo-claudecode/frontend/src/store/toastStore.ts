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

/** Mensajes flash globales: viven en el store, así sobreviven a la navegación entre páginas. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => set((s) => ({ toasts: [...s.toasts, { id: nextId++, type, message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
