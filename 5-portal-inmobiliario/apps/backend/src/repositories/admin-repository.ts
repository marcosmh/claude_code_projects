import "server-only";
import { database } from "@/lib/database/client";
import type { AdminDashboardDto } from "@portal/shared-types";

export type AdminRepository = {
  countIndicators(): Promise<AdminDashboardDto>;
};

export const adminRepository: AdminRepository = {
  async countIndicators() {
    const [
      totalProperties,
      publishedProperties,
      propertiesForSale,
      propertiesForRent,
      users,
      inquiries,
    ] = await Promise.all([
      database.property.count({ where: { deletedAt: null } }),
      database.property.count({ where: { isPublished: true } }),
      database.property.count({ where: { isPublished: true, operation: "SALE" } }),
      database.property.count({ where: { isPublished: true, operation: "RENT" } }),
      database.user.count(),
      database.inquiry.count(),
    ]);
    return {
      totalProperties,
      publishedProperties,
      propertiesForSale,
      propertiesForRent,
      users,
      inquiries,
    };
  },
};
