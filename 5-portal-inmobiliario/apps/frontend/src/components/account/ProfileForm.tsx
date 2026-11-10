"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiRequestError, updateProfile } from "@portal/api-client";
import type { AuthUserDto } from "@portal/shared-types";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  profileFormSchema,
  type ProfileFormData,
  type ProfileFormValues,
} from "@/schemas/auth-forms";

function toFormValues(user: AuthUserDto): ProfileFormValues {
  return { name: user.name, email: user.email, currentPassword: "", newPassword: "" };
}

/** Edición de nombre, email y contraseña de la propia cuenta, precargada con los datos actuales. */
export function ProfileForm({ user }: { user: AuthUserDto }) {
  const { setUser } = useCurrentUser();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(user),
  });

  const saveProfile = async (data: ProfileFormData) => {
    setSubmissionError(null);
    setSavedMessage(null);

    // Cambiar el email o la contraseña exige la contraseña actual (la API también lo comprueba).
    const needsCurrentPassword = data.email !== user.email || data.newPassword !== undefined;
    if (needsCurrentPassword && data.currentPassword === undefined) {
      setError("currentPassword", {
        message: "Ingresa tu contraseña actual para cambiar el email o la contraseña",
      });
      return;
    }

    try {
      const updatedUser = await updateProfile(data);
      await setUser(updatedUser);
      reset(toFormValues(updatedUser));
      setSavedMessage("Tus datos se guardaron correctamente.");
    } catch (error) {
      const isClientError = error instanceof ApiRequestError && error.status < 500;
      setSubmissionError(
        isClientError ? error.message : "No pudimos guardar los cambios. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <section
      aria-labelledby="account-edit-title"
      className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
    >
      <h2 id="account-edit-title" className="text-lg font-semibold">
        Editar datos
      </h2>
      <form
        onSubmit={handleSubmit(saveProfile)}
        noValidate
        aria-label="Formulario de edición de la cuenta"
        className="mt-4 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthTextField
            id="profile-name"
            label="Nombre"
            autoComplete="name"
            errorMessage={errors.name?.message}
            {...register("name")}
          />
          <AuthTextField
            id="profile-email"
            label="Email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            errorMessage={errors.email?.message}
            {...register("email")}
          />
        </div>

        <fieldset className="space-y-4 rounded-lg border border-foreground/10 p-4">
          <legend className="px-1 text-sm font-medium">Seguridad</legend>
          <p className="text-sm text-foreground/70">
            Para cambiar tu email o tu contraseña confirma tu contraseña actual.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthTextField
              id="profile-current-password"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              errorMessage={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <AuthTextField
              id="profile-new-password"
              label="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              hint="Opcional. Mínimo 8 caracteres."
              errorMessage={errors.newPassword?.message}
              {...register("newPassword")}
            />
          </div>
        </fieldset>

        {submissionError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
            {submissionError}
          </p>
        )}
        {savedMessage && (
          <p role="status" className="rounded-md border border-foreground/20 p-3 text-sm">
            {savedMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </section>
  );
}
