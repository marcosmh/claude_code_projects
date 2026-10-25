import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { button, sheet } from "@/components/common/ui";
import { Field, inputClass } from "@/components/features/invoices/form/Field";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useLogin, useSession } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ApiError } from "@/services/apiClient";
import { errorMessage } from "@/utils/apiErrors";
import { loginSchema, safeReturnPath, type LoginValues } from "@/utils/loginForm";

export function LoginPage() {
  useDocumentTitle("Iniciar sesión");
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath((location.state as { from?: unknown } | null)?.from);
  const { data: user } = useSession();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  // Ya hay sesión (p. ej. se abrió /login con la sesión iniciada): no tiene sentido mostrar el formulario.
  if (user) return <Navigate to={returnTo} replace />;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      void navigate(returnTo, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "El email o la contraseña no son correctos."
          : errorMessage(error),
      );
    }
  });

  return (
    <>
      <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-surface px-3">
        <span className="text-lg font-bold">Facturas</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
        <h1 className="text-3xl">Iniciar sesión</h1>
        <p className="mt-2 text-zinc-600">Entra para ver y gestionar tus facturas.</p>

        <form onSubmit={submit} noValidate className={`${sheet} mt-8 space-y-4 p-5`}>
          {formError && (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <Field label="Email" error={errors.email?.message} required>
            {(props) => <input {...props} {...register("email")} type="email" autoComplete="username" className={inputClass} />}
          </Field>
          <Field label="Contraseña" error={errors.password?.message} required>
            {(props) => (
              <input {...props} {...register("password")} type="password" autoComplete="current-password" className={inputClass} />
            )}
          </Field>
          <button type="submit" disabled={isSubmitting} className={`${button("primary")} w-full`}>
            {isSubmitting ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
      </main>
    </>
  );
}
