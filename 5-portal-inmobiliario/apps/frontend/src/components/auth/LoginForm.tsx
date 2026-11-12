"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiRequestError, loginUser } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFlash } from "@/hooks/useFlash";
import { resolvePostLoginPath, sanitizeNextPath } from "@/lib/route-access";
import { loginFormSchema, type LoginFormData, type LoginFormValues } from "@/schemas/auth-forms";
import { AlreadySignedIn } from "./AlreadySignedIn";
import { AuthCard } from "./AuthCard";
import { AuthTextField } from "./AuthTextField";

const linkClassName =
  "font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function LoginForm() {
  const router = useRouter();
  const requestedPath = useSearchParams().get("next");
  const nextPath = sanitizeNextPath(requestedPath);
  const { user, setUser } = useCurrentUser();
  const flash = useFlash();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const signIn = async (data: LoginFormData) => {
    setSubmissionError(null);
    try {
      const signedInUser = await loginUser(data);
      await setUser(signedInUser);
      flash.success(`Bienvenido, ${signedInUser.name}.`);
      router.push(resolvePostLoginPath(signedInUser.role, requestedPath));
    } catch (error) {
      // 401 (credenciales) y 403 (cuenta desactivada) traen un mensaje claro de la API.
      const isClientError = error instanceof ApiRequestError && error.status < 500;
      const message = isClientError
        ? error.message
        : "No pudimos iniciar sesión. Inténtalo de nuevo.";
      setSubmissionError(message);
      flash.error(message);
    }
  };

  return (
    <AuthCard
      titleId="login-title"
      title="Iniciar sesión"
      description="Accede a tu cuenta del Portal Inmobiliario."
    >
      {user ? (
        <AlreadySignedIn user={user} />
      ) : (
        <>
          <form
            onSubmit={handleSubmit(signIn)}
            noValidate
            aria-label="Formulario de inicio de sesión"
            className="space-y-4"
          >
            <AuthTextField
              id="login-email"
              label="Email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="tu@correo.com"
              errorMessage={errors.email?.message}
              {...register("email")}
            />
            <AuthTextField
              id="login-password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              errorMessage={errors.password?.message}
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
              {isSubmitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-foreground/70">
            ¿No tienes cuenta?{" "}
            <Link
              href={`/register${nextPath === "/" ? "" : `?next=${encodeURIComponent(nextPath)}`}`}
              className={linkClassName}
            >
              Regístrate
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
