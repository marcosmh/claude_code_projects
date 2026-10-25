import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RouteErrorBoundary } from "@/pages/RouteErrorBoundary";

/** Páginas con carga diferida: cada una es un chunk aparte. */
export const routes: RouteObject[] = [
  {
    path: "/login",
    errorElement: <RouteErrorBoundary />,
    lazy: async () => ({ Component: (await import("@/pages/LoginPage")).LoginPage }),
  },
  {
    // Todo lo demás exige sesión; sin ella RequireAuth redirige a /login.
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", lazy: async () => ({ Component: (await import("@/pages/DashboardPage")).DashboardPage }) },
      { path: "invoices", lazy: async () => ({ Component: (await import("@/pages/InvoicesPage")).InvoicesPage }) },
      { path: "invoices/new", lazy: async () => ({ Component: (await import("@/pages/NewInvoicePage")).NewInvoicePage }) },
      { path: "invoices/:id", lazy: async () => ({ Component: (await import("@/pages/InvoiceDetailPage")).InvoiceDetailPage }) },
      { path: "invoices/:id/edit", lazy: async () => ({ Component: (await import("@/pages/EditInvoicePage")).EditInvoicePage }) },
      { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
