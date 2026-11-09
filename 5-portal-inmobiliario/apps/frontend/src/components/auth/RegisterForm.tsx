"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiRequestError, registerUser } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  registerFormSchema,
  type RegisterFormData,
  type RegisterFormValues,
} from "@/schemas/auth-forms";
import { AlreadySignedIn } from "./AlreadySignedIn";
import { AuthCard } from "./AuthCard";
import { AuthTextField } from "./AuthTextField";

const linkClassName =
  "font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function RegisterForm() {
  const router = useRouter();
  const { user, setUser } = useCurrentUser();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues, unknown, RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const createAccount = async (data: RegisterFormData) => {
    setSubmissionError(null);
    try {
      // La API inicia sesión al registrar: no hace falta volver a escribir los datos.
      const createdUser = await registerUser(data);
      await setUser(createdUser);
      router.push("/");
    } catch (error) {
      const isClientError = error instanceof ApiRequestError && error.status < 500;
      setSubmissionError(
        isClientError ? error.message : "No pudimos crear la cuenta. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <AuthCard
      titleId="register-title"
      title="Crear cuenta"
      description="Regístrate para guardar propiedades y seguir tus consultas."
    >
      {user ? (
        <AlreadySignedIn user={user} />
      ) : (
        <>
          <form
            onSubmit={handleSubmit(createAccount)}
            noValidate
            aria-label="Formulario de registro"
            className="space-y-4"
          >
            <AuthTextField
              id="register-name"
              label="Nombre"
              type="text"
              autoComplete="name"
              errorMessage={errors.name?.message}
              {...register("name")}
            />
            <AuthTextField
              id="register-email"
              label="Email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="tu@correo.com"
              errorMessage={errors.email?.message}
              {...register("email")}
            />
            <AuthTextField
              id="register-password"
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              errorMessage={errors.password?.message}
              hint="Mínimo 8 caracteres."
              {...register("password")}
            />
            {submissionError && (
              <p
                role="alert"
                className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm"
              >
                {submissionError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-foreground/70">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className={linkClassName}>
              Inicia sesión
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
