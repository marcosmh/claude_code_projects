import type { InputHTMLAttributes } from "react";

const fieldClassName =
  "h-11 w-full rounded-md border border-foreground/20 bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  errorMessage: string | undefined;
  /** Ayuda opcional bajo el campo (p. ej. requisitos de la contraseña). */
  hint?: string;
};

/** Campo con etiqueta y mensaje de error asociados (para usarse con `register` de React Hook Form). */
export function AuthTextField({
  id,
  label,
  errorMessage,
  hint,
  ...inputProps
}: AuthTextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, errorMessage ? errorId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={errorMessage ? "true" : "false"}
        aria-describedby={describedBy || undefined}
        className={fieldClassName}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-foreground/70">
          {hint}
        </p>
      )}
      {errorMessage && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
