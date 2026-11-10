import "server-only";
import { createAuthorizer } from "@/lib/auth/authorizer";
import { hashPassword, spendVerificationTime, verifyPassword } from "@/lib/auth/password";
import { web3FormsNotifier } from "@/lib/integrations/web3forms";
import { favoriteRepository } from "@/repositories/favorite-repository";
import { inquiryRepository } from "@/repositories/inquiry-repository";
import { propertyRepository } from "@/repositories/property-repository";
import { userRepository } from "@/repositories/user-repository";
import { createAuthService } from "./auth-service";
import { createFavoriteService } from "./favorite-service";
import { createInquiryService } from "./inquiry-service";
import { createPropertyService } from "./property-service";

// Raíz de composición: conecta los servicios con sus repositorios e integraciones reales.
export const propertyService = createPropertyService(propertyRepository);
export const inquiryService = createInquiryService({
  repository: inquiryRepository,
  notifier: web3FormsNotifier,
});
export const authService = createAuthService({
  repository: userRepository,
  passwordHasher: { hash: hashPassword, verify: verifyPassword, spendVerificationTime },
});
export const authorizer = createAuthorizer(authService);
export const favoriteService = createFavoriteService(favoriteRepository);
