"use client";

import { useEffect, useState } from "react";
import {
  FLASH_DURATION_MS,
  useFlashStore,
  type FlashKind,
  type FlashMessage,
} from "@/stores/flashStore";

const kindStyles: Record<FlashKind, { box: string; label: string }> = {
  success: {
    box: "border-[var(--success,#047857)]",
    label: "text-[var(--success,#047857)]",
  },
  error: { box: "border-danger", label: "text-danger" },
  info: { box: "border-primary", label: "text-primary" },
};

const kindLabels: Record<FlashKind, string> = {
  success: "Listo",
  error: "Error",
  info: "Aviso",
};

function FlashItem({ message }: { message: FlashMessage }) {
  const dismiss = useFlashStore((state) => state.dismiss);
  // El temporizador se detiene mientras el mensaje está bajo el cursor o con foco.
  const [isPaused, setIsPaused] = useState(false);
  const styles = kindStyles[message.kind];

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => dismiss(message.id), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isPaused, dismiss, message.id]);

  return (
    <div
      role={message.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border-l-4 border-y border-r border-y-foreground/10 border-r-foreground/10 bg-surface p-3 text-sm text-foreground shadow-lg motion-safe:animate-[flash-in_0.2s_ease-out] ${styles.box}`}
    >
      <p className="min-w-0 flex-1 break-words">
        <strong className={`mr-1 font-semibold ${styles.label}`}>
          {kindLabels[message.kind]}:
        </strong>
        {message.text}
      </p>
      <button
        type="button"
        onClick={() => dismiss(message.id)}
        aria-label="Cerrar mensaje"
        className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

/** Región fija en la parte superior con los mensajes flash; vive en el layout raíz. */
export function FlashMessages() {
  const messages = useFlashStore((state) => state.messages);
  if (messages.length === 0) return null;

  return (
    <div
      aria-label="Mensajes"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-3"
    >
      <div className="flex w-full max-w-md flex-col gap-2">
        {messages.map((message) => (
          <FlashItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
