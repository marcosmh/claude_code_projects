"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSWRConfig } from "swr";
import {
  adminPropertiesUrl,
  ApiRequestError,
  createAdminProperty,
  updateAdminProperty,
} from "@portal/api-client";
import type { AdminPropertyDto } from "@portal/shared-types";
import { formatAvailability, formatOperation, formatPropertyType } from "@/lib/format";
import {
  emptyPropertyFormValues,
  propertyFormSchema,
  propertyToFormValues,
  type PropertyFormData,
  type PropertyFormValues,
} from "@/schemas/property-form";
import { CheckboxField, SelectField, TextAreaField, TextField } from "./property-form-fields";

type PropertyFormProps = {
  /** Propiedad a editar; sin ella el formulario crea una nueva. */
  property?: AdminPropertyDto;
};

const operationOptions = (["SALE", "RENT"] as const).map((value) => ({
  value,
  label: formatOperation(value),
}));
const typeOptions = (["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"] as const).map(
  (value) => ({ value, label: formatPropertyType(value) }),
);
const availabilityOptions = (["AVAILABLE", "SOLD", "RENTED"] as const).map((value) => ({
  value,
  label: formatAvailability(value),
}));
const currencyOptions = [
  { value: "MXN", label: "Pesos mexicanos (MXN)" },
  { value: "USD", label: "Dólares (USD)" },
];

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm">
      <legend className="px-2 text-lg font-semibold">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Formulario de creación y edición de propiedades (administración). */
export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues, unknown, PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: property ? propertyToFormValues(property) : emptyPropertyFormValues,
  });

  const saveProperty = async (data: PropertyFormData) => {
    setSubmissionError(null);
    try {
      if (property) await updateAdminProperty(property.id, data);
      else await createAdminProperty(data);
    } catch (error) {
      const isClientError = error instanceof ApiRequestError && error.status < 500;
      setSubmissionError(
        isClientError ? error.message : "No pudimos guardar la propiedad. Inténtalo de nuevo.",
      );
      return;
    }
    // El listado, el dashboard y la ficha en edición deben mostrar lo guardado.
    await mutate(
      (key) =>
        (typeof key === "string" && key.startsWith(adminPropertiesUrl)) ||
        (Array.isArray(key) && key[0] === "admin-property"),
    );
    router.push("/admin/properties");
  };

  return (
    <form
      onSubmit={handleSubmit(saveProperty)}
      noValidate
      aria-label={property ? "Editar propiedad" : "Nueva propiedad"}
      className="space-y-6"
    >
      <FormSection title="Información general">
        <div className="sm:col-span-2">
          <TextField
            id="property-title"
            label="Título"
            maxLength={150}
            errorMessage={errors.title?.message}
            {...register("title")}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            id="property-description"
            label="Descripción"
            rows={6}
            maxLength={5000}
            errorMessage={errors.description?.message}
            {...register("description")}
          />
        </div>
        <SelectField
          id="property-operation"
          label="Operación"
          options={operationOptions}
          errorMessage={errors.operation?.message}
          {...register("operation")}
        />
        <SelectField
          id="property-type"
          label="Tipo de propiedad"
          options={typeOptions}
          errorMessage={errors.type?.message}
          {...register("type")}
        />
      </FormSection>

      <FormSection title="Precio">
        <TextField
          id="property-price"
          label="Precio"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          errorMessage={errors.price?.message}
          {...register("price")}
        />
        <SelectField
          id="property-currency"
          label="Moneda"
          options={currencyOptions}
          errorMessage={errors.currency?.message}
          {...register("currency")}
        />
      </FormSection>

      <FormSection title="Características">
        <TextField
          id="property-usable-area"
          label="Superficie útil (m²)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          errorMessage={errors.usableArea?.message}
          {...register("usableArea")}
        />
        <TextField
          id="property-total-area"
          label="Superficie total (m²)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          errorMessage={errors.totalArea?.message}
          {...register("totalArea")}
        />
        <TextField
          id="property-bedrooms"
          label="Dormitorios"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          errorMessage={errors.bedrooms?.message}
          {...register("bedrooms")}
        />
        <TextField
          id="property-bathrooms"
          label="Baños"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          errorMessage={errors.bathrooms?.message}
          {...register("bathrooms")}
        />
        <TextField
          id="property-parking"
          label="Estacionamientos"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          errorMessage={errors.parkingSpots?.message}
          {...register("parkingSpots")}
        />
        <TextField
          id="property-age"
          label="Antigüedad (años)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          errorMessage={errors.age?.message}
          {...register("age")}
        />
      </FormSection>

      <FormSection title="Ubicación">
        <div className="sm:col-span-2">
          <TextField
            id="property-address"
            label="Dirección"
            autoComplete="off"
            maxLength={200}
            errorMessage={errors.address?.message}
            {...register("address")}
          />
        </div>
        <TextField
          id="property-commune"
          label="Colonia"
          maxLength={100}
          errorMessage={errors.commune?.message}
          {...register("commune")}
        />
        <TextField
          id="property-city"
          label="Ciudad"
          maxLength={100}
          errorMessage={errors.city?.message}
          {...register("city")}
        />
        <TextField
          id="property-region"
          label="Estado"
          maxLength={100}
          errorMessage={errors.region?.message}
          {...register("region")}
        />
      </FormSection>

      <FormSection title="Publicación">
        <SelectField
          id="property-availability"
          label="Estado de la propiedad"
          options={availabilityOptions}
          errorMessage={errors.availability?.message}
          {...register("availability")}
        />
        <CheckboxField
          id="property-published"
          label="Publicada"
          hint="Visible para todo el público en el catálogo."
          {...register("isPublished")}
        />
        <CheckboxField
          id="property-featured"
          label="Destacada"
          hint="Aparece en la sección de propiedades destacadas."
          {...register("isFeatured")}
        />
      </FormSection>

      {submissionError && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
          {submissionError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/properties"
          className={`inline-flex h-11 items-center rounded-md border border-foreground/20 px-5 text-sm font-semibold hover:bg-foreground/5 ${focusClassName}`}
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 ${focusClassName}`}
        >
          {isSubmitting ? "Guardando…" : property ? "Guardar cambios" : "Crear propiedad"}
        </button>
      </div>
    </form>
  );
}
