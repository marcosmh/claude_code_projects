"use client";

import { useId, useState } from "react";
import useSWR from "swr";
import {
  ApiRequestError,
  adminFeaturesUrl,
  createAdminFeature,
  fetchAdminFeatures,
  setPropertyFeatures,
} from "@portal/api-client";
import type { FeatureDto } from "@portal/shared-types";

type PropertyFeaturesManagerProps = {
  propertyId: string;
  /** Características que la propiedad tiene ahora. */
  features: readonly FeatureDto[];
  /** Se llama tras guardar para que el padre vuelva a cargar la propiedad. */
  onChanged: () => Promise<unknown> | void;
};

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function describeError(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError && error.status < 500 ? error.message : fallback;
}

/** Características de una propiedad: marcar del catálogo y crear nuevas al vuelo. */
export function PropertyFeaturesManager({
  propertyId,
  features,
  onChanged,
}: PropertyFeaturesManagerProps) {
  const nameInputId = useId();
  const {
    data: catalog,
    error: catalogError,
    mutate: reloadCatalog,
  } = useSWR(adminFeaturesUrl, fetchAdminFeatures, { revalidateOnFocus: false });
  const [newName, setNewName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const selectedIds = features.map((feature) => feature.id);

  const save = async (featureIds: string[], success: string) => {
    await setPropertyFeatures(propertyId, featureIds);
    await onChanged();
    setStatus(success);
  };

  const toggle = async (featureId: string, isChecked: boolean) => {
    setIsBusy(true);
    setMessage(null);
    try {
      const next = isChecked
        ? [...selectedIds, featureId]
        : selectedIds.filter((id) => id !== featureId);
      await save(next, "Características actualizadas.");
    } catch (error) {
      setMessage(describeError(error, "No pudimos guardar las características."));
    } finally {
      setIsBusy(false);
    }
  };

  const addFeature = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (name === "") {
      setMessage("Escribe el nombre de la característica.");
      return;
    }
    setIsBusy(true);
    setMessage(null);
    try {
      const created = await createAdminFeature(name);
      await reloadCatalog();
      await save([...selectedIds, created.id], `Se agregó «${created.name}».`);
      setNewName("");
    } catch (error) {
      setMessage(describeError(error, "No pudimos crear la característica."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`${nameInputId}-title`}
      className="rounded-lg border border-foreground/15 bg-surface p-5"
    >
      <h2 id={`${nameInputId}-title`} className="text-lg font-semibold">
        Características
      </h2>
      <p className="mt-1 text-sm text-foreground/70">
        Los cambios se guardan al marcar o desmarcar. Puedes crear características nuevas.
      </p>

      {catalogError ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          No pudimos cargar el catálogo de características.
        </p>
      ) : catalog === undefined ? (
        <p role="status" className="mt-4 text-sm text-foreground/70">
          Cargando características…
        </p>
      ) : catalog.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/70">Todavía no hay características.</p>
      ) : (
        <fieldset disabled={isBusy} className="mt-4">
          <legend className="sr-only">Características de la propiedad</legend>
          <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {catalog.map((feature) => (
              <li key={feature.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(feature.id)}
                    onChange={(event) => void toggle(feature.id, event.target.checked)}
                    className={`size-5 accent-primary ${focusClassName}`}
                  />
                  {feature.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <form onSubmit={(event) => void addFeature(event)} className="mt-5 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={nameInputId} className="block text-sm font-medium">
            Nueva característica
          </label>
          <input
            id={nameInputId}
            value={newName}
            maxLength={60}
            onChange={(event) => setNewName(event.target.value)}
            disabled={isBusy}
            className={`mt-1 h-10 w-full rounded-md border border-foreground/20 bg-surface px-3 text-sm ${focusClassName}`}
          />
        </div>
        <button
          type="submit"
          disabled={isBusy}
          className={`h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 ${focusClassName}`}
        >
          Agregar
        </button>
      </form>

      <p role="status" className="mt-3 text-sm text-foreground/70">
        {isBusy ? "Guardando…" : status}
      </p>
      {message && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {message}
        </p>
      )}
    </section>
  );
}
