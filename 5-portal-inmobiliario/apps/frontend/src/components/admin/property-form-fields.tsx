import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlClassName =
  "w-full rounded-md border border-foreground/20 bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";

type FieldShellProps = {
  id: string;
  label: string;
  errorMessage: string | undefined;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
};

/** Etiqueta, ayuda y error asociados al control (se pasa `aria-describedby` al control). */
function FieldShell({ id, label, errorMessage, hint, children }: FieldShellProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint ? hintId : null, errorMessage ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children(describedBy)}
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

type CommonProps = { id: string; label: string; errorMessage: string | undefined; hint?: string };

export function TextField({
  id,
  label,
  errorMessage,
  hint,
  ...inputProps
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} errorMessage={errorMessage} hint={hint}>
      {(describedBy) => (
        <input
          id={id}
          aria-invalid={errorMessage ? "true" : "false"}
          aria-describedby={describedBy}
          className={`h-11 ${controlClassName}`}
          {...inputProps}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  errorMessage,
  hint,
  ...textareaProps
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} errorMessage={errorMessage} hint={hint}>
      {(describedBy) => (
        <textarea
          id={id}
          aria-invalid={errorMessage ? "true" : "false"}
          aria-describedby={describedBy}
          className={`py-2 ${controlClassName}`}
          {...textareaProps}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  errorMessage,
  hint,
  options,
  ...selectProps
}: CommonProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <FieldShell id={id} label={label} errorMessage={errorMessage} hint={hint}>
      {(describedBy) => (
        <select
          id={id}
          aria-invalid={errorMessage ? "true" : "false"}
          aria-describedby={describedBy}
          className={`h-11 ${controlClassName}`}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  id,
  label,
  hint,
  ...inputProps
}: { id: string; label: string; hint?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>) {
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? hintId : undefined}
        className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        {...inputProps}
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && (
          <p id={hintId} className="text-sm text-foreground/70">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
