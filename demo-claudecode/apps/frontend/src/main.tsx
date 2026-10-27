import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { endSession } from "./hooks/useAuth";
import { createQueryClient } from "./queryClient";
import { setUnauthorizedHandler } from "./services/apiClient";
import { purgeLegacyAccessToken } from "./services/sessionFlags";
import { createAppRouter } from "./router";

const queryClient = createQueryClient();
const router = createAppRouter();
// Una sesión caducada o revocada (401) devuelve al inicio de sesión sin recargar la página.
purgeLegacyAccessToken();
setUnauthorizedHandler(() => endSession(queryClient));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
