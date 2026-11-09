"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  buildCatalogSearchHref,
  propertySearchFormSchema,
  type PropertySearchFormValues,
} from "@/schemas/property-search-form";

const fieldClassName =
  "h-12 w-full rounded-md border border-foreground/20 bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function HeroSection() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertySearchFormValues>({
    resolver: zodResolver(propertySearchFormSchema),
    defaultValues: { search: "", operation: "ALL" },
  });

  const submitSearch = (values: PropertySearchFormValues) => {
    router.push(buildCatalogSearchHref(values));
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="bg-gradient-to-b from-hero-tint/10 to-transparent"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <h1 id="hero-title" className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Encuentra la propiedad ideal en México
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-foreground/70">
          Casas, departamentos, terrenos y oficinas en venta o arriendo. Busca, compara y contacta
          en un solo lugar.
        </p>

        <form
          role="search"
          aria-label="Buscar propiedades"
          onSubmit={handleSubmit(submitSearch)}
          noValidate
          className="mt-8 grid gap-3 rounded-xl border border-foreground/10 bg-surface p-4 shadow-sm sm:grid-cols-[1fr_12rem_auto]"
        >
          <div>
            <label htmlFor="hero-search" className="mb-1 block text-sm font-medium">
              ¿Dónde quieres vivir?
            </label>
            <input
              id="hero-search"
              type="search"
              placeholder="Ej. Polanco, Mérida o Jalisco…"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.search ? "true" : "false"}
              aria-describedby={errors.search ? "hero-search-error" : undefined}
              className={fieldClassName}
              {...register("search")}
            />
            {errors.search && (
              <p id="hero-search-error" role="alert" className="mt-1 text-sm text-danger">
                {errors.search.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="hero-operation" className="mb-1 block text-sm font-medium">
              Operación
            </label>
            <select id="hero-operation" className={fieldClassName} {...register("operation")}>
              <option value="ALL">Comprar o arrendar</option>
              <option value="SALE">Comprar</option>
              <option value="RENT">Arrendar</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-12 self-end rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Buscar
          </button>
        </form>
      </div>
    </section>
  );
}
