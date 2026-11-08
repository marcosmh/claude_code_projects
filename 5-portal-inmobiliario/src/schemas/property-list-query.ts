import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 12;
export const MAXIMUM_PAGE_SIZE = 50;

export const propertyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAXIMUM_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
