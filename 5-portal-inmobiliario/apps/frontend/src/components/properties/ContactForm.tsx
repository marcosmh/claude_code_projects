"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  contactFormSchema,
  type ContactFormData,
  type ContactFormValues,
} from "@/schemas/contact-form";
import { submitInquiry } from "@portal/api-client";

type ContactFormProps = {
  propertyId: string;
  propertyTitle: string;
};

type SubmissionState = "idle" | "sending" | "success" | "error";

const fieldClassName =
  "w-full rounded-md border border-foreground/20 bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";

export function ContactForm({ propertyId, propertyTitle }: ContactFormProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues, unknown, ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const sendInquiry = async (data: ContactFormData) => {
    setSubmissionState("sending");
    try {
      await submitInquiry({ propertyId, ...data });
      reset();
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  };

  if (submissionState === "success") {
    return (
      <section aria-labelledby="contact-title" className="mt-8">
        <h2 id="contact-title" className="text-xl font-semibold">
          Contacto
        </h2>
        <div role="status" className="mt-3 rounded-lg border border-foreground/10 bg-surface p-4">
          <p className="font-medium">¡Consulta enviada!</p>
          <p className="mt-1 text-sm text-foreground/70">
            Recibimos tu mensaje sobre “{propertyTitle}”. Te responderemos pronto.
          </p>
          <button
            type="button"
            onClick={() => setSubmissionState("idle")}
            className="mt-3 text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Enviar otra consulta
          </button>
        </div>
      </section>
    );
  }

  const isSending = submissionState === "sending";

  const textField = (
    name: "name" | "email" | "phone",
    label: string,
    inputProps: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <div>
      <label htmlFor={`contact-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`contact-${name}`}
        aria-invalid={errors[name] ? "true" : "false"}
        aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
        className={fieldClassName}
        {...inputProps}
        {...register(name)}
      />
      {errors[name] && (
        <p id={`contact-${name}-error`} role="alert" className="mt-1 text-sm text-danger">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <section aria-labelledby="contact-title" className="mt-8">
      <h2 id="contact-title" className="text-xl font-semibold">
        Contacto
      </h2>
      <p className="mt-1 text-foreground/70">¿Te interesa esta propiedad? Escríbenos.</p>
      <form
        onSubmit={handleSubmit(sendInquiry)}
        noValidate
        aria-label="Formulario de contacto"
        className="mt-4 space-y-4"
      >
        {textField("name", "Nombre", { type: "text", autoComplete: "name" })}
        {textField("email", "Email", {
          type: "email",
          autoComplete: "email",
          spellCheck: false,
          placeholder: "tu@correo.com",
        })}
        {textField("phone", "Teléfono (opcional)", {
          type: "tel",
          autoComplete: "tel",
          inputMode: "tel",
          placeholder: "Ej. 55 1234 5678…",
        })}
        <div>
          <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
            Mensaje
          </label>
          <textarea
            id="contact-message"
            rows={4}
            aria-invalid={errors.message ? "true" : "false"}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            className={fieldClassName}
            {...register("message")}
          />
          {errors.message && (
            <p id="contact-message-error" role="alert" className="mt-1 text-sm text-danger">
              {errors.message.message}
            </p>
          )}
        </div>

        {submissionState === "error" && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
            No pudimos enviar tu consulta. Revisa tu conexión e inténtalo de nuevo.
          </p>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="h-11 w-full rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Enviando…" : "Enviar consulta"}
        </button>
      </form>
    </section>
  );
}
