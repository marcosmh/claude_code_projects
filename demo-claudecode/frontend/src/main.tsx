import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { createQueryClient } from "./queryClient";
import { createAppRouter } from "./router";

const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
