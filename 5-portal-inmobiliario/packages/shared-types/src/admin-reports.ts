import type { Currency, PropertyAvailability, PropertyOperation, PropertyType } from "./property";

/** Cantidad de elementos para una clave (valor de enumeración, ciudad, etc.). */
export type ReportCountDto<TKey extends string = string> = { key: TKey; count: number };

/** Propiedad con una cantidad asociada (consultas recibidas o veces guardada como favorita). */
export type ReportTopPropertyDto = { id: string; title: string; count: number };

export type ReportAveragePriceDto = {
  operation: PropertyOperation;
  currency: Currency;
  average: number;
  /** Propiedades publicadas que entran en el promedio. */
  count: number;
};

/** Actividad de un mes (`month` con formato `YYYY-MM`). */
export type ReportMonthlyActivityDto = {
  month: string;
  properties: number;
  inquiries: number;
  users: number;
};

/** Reportes y estadísticas del administrador (GET /api/admin/reports, spec §58). */
export type AdminReportsDto = {
  generatedAt: string;
  properties: {
    byOperation: ReportCountDto<PropertyOperation>[];
    byType: ReportCountDto<PropertyType>[];
    byAvailability: ReportCountDto<PropertyAvailability>[];
    byVisibility: ReportCountDto<"PUBLISHED" | "DRAFT">[];
    /** Las ciudades con más propiedades (máximo 5). */
    topCities: ReportCountDto[];
    averagePrices: ReportAveragePriceDto[];
  };
  inquiries: {
    total: number;
    last30Days: number;
    fromUsers: number;
    fromVisitors: number;
    topProperties: ReportTopPropertyDto[];
  };
  favorites: { total: number; topProperties: ReportTopPropertyDto[] };
  users: { total: number; active: number; inactive: number; admins: number };
  /** Últimos 6 meses, del más antiguo al actual. */
  monthly: ReportMonthlyActivityDto[];
};
