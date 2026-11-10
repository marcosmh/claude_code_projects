import {
  loginInputSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from "@portal/shared-types";
import type { z } from "zod";

// Mismas reglas que la API: el formulario nunca acepta lo que el backend rechazaría.
export const loginFormSchema = loginInputSchema;
export const registerFormSchema = registerInputSchema;
export const profileFormSchema = updateProfileInputSchema;

export type LoginFormValues = z.input<typeof loginFormSchema>;
export type LoginFormData = z.output<typeof loginFormSchema>;
export type RegisterFormValues = z.input<typeof registerFormSchema>;
export type RegisterFormData = z.output<typeof registerFormSchema>;
export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormData = z.output<typeof profileFormSchema>;
