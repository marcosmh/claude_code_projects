export type PropertyOperation = "SALE" | "RENT";
export type PropertyType = "HOUSE" | "APARTMENT" | "LAND" | "OFFICE" | "COMMERCIAL" | "OTHER";
export type Currency = "MXN" | "USD";
/** Estado comercial de una propiedad publicada. */
export type PropertyAvailability = "AVAILABLE" | "SOLD" | "RENTED";

export type PropertyImageDto = {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
};

export type FeatureDto = {
  id: string;
  name: string;
  slug: string;
};

/** Representación resumida para tarjetas y listados. */
export type PropertySummaryDto = {
  id: string;
  title: string;
  operation: PropertyOperation;
  type: PropertyType;
  price: number;
  currency: Currency;
  availability: PropertyAvailability;
  usableArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  commune: string;
  city: string;
  region: string;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  createdAt: string;
};

/** Representación completa para la página de detalle. */
export type PropertyDetailDto = Omit<PropertySummaryDto, "primaryImageUrl"> & {
  description: string;
  totalArea: number | null;
  parkingSpots: number | null;
  age: number | null;
  address: string;
  updatedAt: string;
  images: PropertyImageDto[];
  features: FeatureDto[];
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Valores distintos de ubicación en propiedades publicadas (opciones de los filtros). */
export type PropertyLocationsDto = {
  cities: string[];
  regions: string[];
};
