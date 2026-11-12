"use client";

import { create } from "zustand";

export type FlashKind = "success" | "error" | "info";

export type FlashMessage = { id: number; kind: FlashKind; text: string };

/** Mensajes visibles a la vez; al superar el máximo se descartan los más antiguos. */
export const MAX_VISIBLE_FLASH_MESSAGES = 3;
/** Los mensajes se cierran solos pasado este tiempo (spec §57). */
export const FLASH_DURATION_MS = 5000;

type FlashStore = {
  messages: FlashMessage[];
  show: (kind: FlashKind, text: string) => void;
  dismiss: (id: number) => void;
};

let nextMessageId = 1;

export const useFlashStore = create<FlashStore>((set) => ({
  messages: [],

  show: (kind, text) =>
    set((state) => ({
      messages: [...state.messages, { id: nextMessageId++, kind, text }].slice(
        -MAX_VISIBLE_FLASH_MESSAGES,
      ),
    })),

  dismiss: (id) => set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),
}));
