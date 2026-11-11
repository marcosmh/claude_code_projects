/** Indicadores del panel de administración (GET /api/admin/dashboard). */
export type AdminDashboardDto = {
  totalProperties: number;
  publishedProperties: number;
  /** Propiedades publicadas en venta. */
  propertiesForSale: number;
  /** Propiedades publicadas en arriendo. */
  propertiesForRent: number;
  users: number;
  inquiries: number;
};
