import "server-only";
import { createCloudinaryStorage } from "@/lib/cloudinary/cloudinary-storage";
import { createAuthorizer } from "@/lib/auth/authorizer";
import { hashPassword, spendVerificationTime, verifyPassword } from "@/lib/auth/password";
import { adminPropertyRepository } from "@/repositories/admin-property-repository";
import { adminInquiryRepository } from "@/repositories/admin-inquiry-repository";
import { adminUserRepository } from "@/repositories/admin-user-repository";
import { adminReportsRepository } from "@/repositories/admin-reports-repository";
import { adminRepository } from "@/repositories/admin-repository";
import { featureRepository } from "@/repositories/feature-repository";
import { favoriteRepository } from "@/repositories/favorite-repository";
import { inquiryRepository } from "@/repositories/inquiry-repository";
import { propertyImageRepository } from "@/repositories/property-image-repository";
import { propertyRepository } from "@/repositories/property-repository";
import { userRepository } from "@/repositories/user-repository";
import { createAdminInquiryService } from "./admin-inquiry-service";
import { createAdminUserService } from "./admin-user-service";
import { createAdminReportsService } from "./admin-reports-service";
import { createAdminService } from "./admin-service";
import { createAdminPropertyService } from "./admin-property-service";
import { createAuthService } from "./auth-service";
import { createFeatureService } from "./feature-service";
import { createFavoriteService } from "./favorite-service";
import { createInquiryService } from "./inquiry-service";
import { createPropertyImageService } from "./property-image-service";
import { createPropertyService } from "./property-service";

// Raíz de composición: conecta los servicios con sus repositorios e integraciones reales.
export const propertyService = createPropertyService(propertyRepository);
export const inquiryService = createInquiryService(inquiryRepository);
export const authService = createAuthService({
  repository: userRepository,
  passwordHasher: { hash: hashPassword, verify: verifyPassword, spendVerificationTime },
});
export const authorizer = createAuthorizer(authService);
export const favoriteService = createFavoriteService(favoriteRepository);
export const adminService = createAdminService(adminRepository);
export const adminPropertyService = createAdminPropertyService(adminPropertyRepository);
export const propertyImageService = createPropertyImageService({
  properties: adminPropertyRepository,
  images: propertyImageRepository,
  storage: createCloudinaryStorage(),
});
export const featureService = createFeatureService({
  features: featureRepository,
  properties: adminPropertyRepository,
});
export const adminUserService = createAdminUserService({
  repository: adminUserRepository,
  hashPassword,
  findEmailOwner: userRepository.findByEmail,
});
export const adminInquiryService = createAdminInquiryService(adminInquiryRepository);
export const adminReportsService = createAdminReportsService(adminReportsRepository);
