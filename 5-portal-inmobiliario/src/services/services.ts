import "server-only";
import { propertyRepository } from "@/repositories/property-repository";
import { createPropertyService } from "./property-service";

// Raíz de composición: conecta los servicios con sus repositorios reales.
export const propertyService = createPropertyService(propertyRepository);
