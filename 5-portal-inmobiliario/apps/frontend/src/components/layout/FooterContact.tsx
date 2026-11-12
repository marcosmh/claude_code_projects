"use client";

import { useSiteSettings } from "@/hooks/useSiteSettings";

/** Correo y teléfono de contacto del portal (configuración del sistema); nada si no hay ninguno. */
export function FooterContact() {
  const { settings } = useSiteSettings();
  if (!settings.contactEmail && !settings.contactPhone) return null;

  const linkClassName =
    "hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/70">
      {settings.contactEmail && (
        <a href={`mailto:${settings.contactEmail}`} className={linkClassName}>
          {settings.contactEmail}
        </a>
      )}
      {settings.contactPhone && (
        <a href={`tel:${settings.contactPhone.replace(/[^0-9+]/g, "")}`} className={linkClassName}>
          {settings.contactPhone}
        </a>
      )}
    </p>
  );
}
