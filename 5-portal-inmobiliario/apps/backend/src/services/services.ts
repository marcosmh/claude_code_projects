import "server-only";
import { web3FormsNotifier } from "@/lib/integrations/web3forms";
import { inquiryRepository } from "@/repositories/inquiry-repository";
import { propertyRepository } from "@/repositories/property-repository";
import { createInquiryService } from "./inquiry-service";
import { createPropertyService } from "./property-service";

// Raíz de composición: conecta los servicios con sus repositorios e integraciones reales.
export const propertyService = createPropertyService(propertyRepository);
export const inquiryService = createInquiryService({
  repository: inquiryRepository,
  notifier: web3FormsNotifier,
});
