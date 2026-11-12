import { createAdminUserInputSchema } from "@portal/shared-types";
import type { z } from "zod";

// Mismas reglas que la API: el formulario nunca acepta lo que el backend rechazaría.
export const adminUserFormSchema = createAdminUserInputSchema;

export type AdminUserFormValues = z.input<typeof adminUserFormSchema>;
export type AdminUserFormData = z.output<typeof adminUserFormSchema>;
