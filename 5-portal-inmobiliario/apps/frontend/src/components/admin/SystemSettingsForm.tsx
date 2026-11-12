"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import useSWR, { useSWRConfig } from "swr";
import {
  ApiRequestError,
  adminSettingsUrl,
  fetchAdminSettings,
  publicSettingsUrl,
  updateAdminSettings,
} from "@portal/api-client";
import {
  systemSettingsSchema,
  type SystemSettingsDto,
  type UpdateSystemSettingsInput,
} from "@portal/shared-types";
import { useFlash } from "@/hooks/useFlash";
import { AdminPageHeader } from "./AdminPageHeader";
import { CheckboxField, SelectField, TextField } from "./property-form-fields";

const currencyOptions = [
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
];

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Las cadenas vacías del formulario se guardan como «sin valor» (lo convierte el esquema). */
function toFormValues(settings: SystemSettingsDto): UpdateSystemSettingsInput {
  return {
    ...settings,
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
  };
}

function fieldMessage(error: { message?: unknown } | undefined): string | undefined {
  return typeof error?.message === "string" ? error.message : undefined;
}

/** Configuración del sistema del área de administración (solo ADMIN, spec §59). */
export function SystemSettingsForm() {
  const flash = useFlash();
  const { mutate: mutateMatching } = useSWRConfig();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    data: current,
    error: loadError,
    mutate: reload,
    isValidating,
  } = useSWR(adminSettingsUrl, fetchAdminSettings, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateSystemSettingsInput, unknown, SystemSettingsDto>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: toFormValues({
      allowRegistration: true,
      defaultCurrency: "MXN",
      contactEmail: null,
      contactPhone: null,
    }),
  });

  // Al llegar (o recargarse) la configuración guardada, el formulario parte de ella.
  useEffect(() => {
    if (current) reset(toFormValues(current));
  }, [current, reset]);

  const saveSettings = async (data: SystemSettingsDto) => {
    setSubmissionError(null);
    try {
      const saved = await updateAdminSettings(data);
      await reload(saved, { revalidate: false });
      // El pie de página, el registro y la pantalla de acceso leen la copia pública.
      await mutateMatching(publicSettingsUrl);
      reset(toFormValues(saved));
      flash.success("Configuración guardada.");
    } catch (error) {
      const message =
        error instanceof ApiRequestError && error.status < 500
          ? error.message
          : "No pudimos guardar la configuración. Inténtalo de nuevo.";
      setSubmissionError(message);
      flash.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AdminPageHeader
        title="Configuración del sistema"
        description="Ajustes generales del portal. Los cambios se aplican al guardar."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Configuración" }]}
      />

      {loadError ? (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm"
        >
          <p>No pudimos cargar la configuración. Revisa tu conexión y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={isValidating}
            className={`rounded-md border border-foreground/20 px-4 py-2 font-semibold hover:bg-foreground/5 disabled:opacity-60 ${focusClassName}`}
          >
            {isValidating ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : current === undefined ? (
        <p role="status" className="mt-6 text-sm text-foreground/70">
          Cargando configuración…
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(saveSettings)}
          noValidate
          aria-label="Configuración del sistema"
          className="mt-6 space-y-8 rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm"
        >
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Cuentas</legend>
            <CheckboxField
              id="settings-allow-registration"
              label="Permitir que las personas creen su propia cuenta"
              hint="Si lo desactivas, /register muestra un aviso y la API rechaza los registros. Los administradores pueden seguir dando de alta usuarios."
              {...register("allowRegistration")}
            />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Propiedades</legend>
            <SelectField
              id="settings-default-currency"
              label="Moneda por defecto"
              options={currencyOptions}
              hint="Moneda preseleccionada al crear una propiedad."
              errorMessage={fieldMessage(errors.defaultCurrency)}
              {...register("defaultCurrency")}
            />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Contacto del portal</legend>
            <p className="text-sm text-foreground/70">
              Se muestra en el pie de página. Déjalo vacío para no mostrarlo.
            </p>
            <TextField
              id="settings-contact-email"
              label="Correo de contacto"
              type="email"
              autoComplete="off"
              spellCheck={false}
              maxLength={254}
              errorMessage={fieldMessage(errors.contactEmail)}
              {...register("contactEmail")}
            />
            <TextField
              id="settings-contact-phone"
              label="Teléfono de contacto"
              type="tel"
              autoComplete="off"
              maxLength={20}
              hint="Ejemplo: +52 55 1234 5678"
              errorMessage={fieldMessage(errors.contactPhone)}
              {...register("contactPhone")}
            />
          </fieldset>

          {submissionError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
              {submissionError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => reset(toFormValues(current))}
              disabled={!isDirty || isSubmitting}
              className={`inline-flex h-11 items-center rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-60 ${focusClassName}`}
            >
              Descartar cambios
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className={`inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 ${focusClassName}`}
            >
              {isSubmitting ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
