import { isRouteErrorResponse, useRouteError } from "react-router";
import { ErrorState } from "@/components/common/ErrorState";
import { NotFoundPage } from "./NotFoundPage";

/** Error boundary de las rutas: 404 de ruta o error inesperado de render. */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <ErrorState
      message="Ocurrió un error inesperado. Vuelve a intentarlo; si sigue fallando, recarga la página."
      onRetry={() => window.location.reload()}
    />
  );
}
