import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { button, sheet } from "@/components/common/ui";
import { Field, inputClass } from "@/components/features/invoices/form/Field";
import { useChangePassword } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ApiError } from "@/services/apiClient";
import { errorMessage } from "@/utils/apiErrors";
import { passwordSchema, type PasswordValues } from "@/utils/loginForm";

const SERVER_FIELDS = new Set<string>(["currentPassword", "newPassword"]);

export function ChangePasswordPage() {
  useDocumentTitle("Cambiar contraseña");
  const navigate = useNavigate();
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      await navigate("/dashboard");
    } catch (error) {
      const fields = error instanceof ApiError ? error.details.filter((d) => d.field && SERVER_FIELDS.has(d.field)) : [];
      if (fields.length === 0) return setFormError(errorMessage(error));
      for (const { field, message } of fields) setError(field as "currentPassword" | "newPassword", { message });
    }
  });

  return (
    <>
      <PageHeader title="Cambiar contraseña" trail={[{ label: "Cuenta" }]} />
      <form onSubmit={submit} noValidate className={`${sheet} max-w-md space-y-4 p-5`}>
        {formError && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
        <Field label="Contraseña actual" error={errors.currentPassword?.message} required>
          {(props) => <input {...props} {...register("currentPassword")} type="password" autoComplete="current-password" className={inputClass} />}
        </Field>
        <Field label="Nueva contraseña" error={errors.newPassword?.message} required>
          {(props) => <input {...props} {...register("newPassword")} type="password" autoComplete="new-password" className={inputClass} />}
        </Field>
        <Field label="Repite la nueva contraseña" error={errors.confirm?.message} required>
          {(props) => <input {...props} {...register("confirm")} type="password" autoComplete="new-password" className={inputClass} />}
        </Field>
        <p className="text-sm text-zinc-600">Mínimo 12 caracteres. Al cambiarla se cierra la sesión en tus otros dispositivos.</p>
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className={button("primary")}>
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </button>
          <Link to="/dashboard" className={button("secondary")}>
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
