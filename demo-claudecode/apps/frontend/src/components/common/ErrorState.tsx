import { button } from "./ui";

/** Error de carga con acción de reintento. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="py-16">
      <h1 className="text-3xl">No se pudo cargar la página</h1>
      <p className="mt-2 max-w-prose text-zinc-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${button("primary")} mt-6`}>
          Reintentar
        </button>
      )}
    </div>
  );
}
