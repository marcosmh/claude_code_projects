import { describe, expect, it } from "vitest";
import {
  AUDIT_LOG_PAGE_SIZE,
  auditActionsByCategory,
  auditCategoryOf,
  auditLogListQuerySchema,
  type AuditAction,
} from "./audit-log";

describe("auditCategoryOf", () => {
  it("devuelve la categoría de cada acción", () => {
    for (const [category, actions] of Object.entries(auditActionsByCategory)) {
      for (const action of actions) expect(auditCategoryOf(action as AuditAction)).toBe(category);
    }
  });

  it("no repite acciones entre categorías", () => {
    const all = Object.values(auditActionsByCategory).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("auditLogListQuerySchema", () => {
  it("aplica los valores por defecto", () => {
    expect(auditLogListQuerySchema.parse({})).toEqual({ page: 1, pageSize: AUDIT_LOG_PAGE_SIZE });
  });

  it("trata los textos vacíos como sin filtro", () => {
    const parsed = auditLogListQuerySchema.parse({ search: " ", category: "", from: "", to: "" });
    expect(parsed).toEqual({ page: 1, pageSize: AUDIT_LOG_PAGE_SIZE });
  });

  it("acepta categoría, búsqueda y rango de fechas", () => {
    const parsed = auditLogListQuerySchema.parse({
      category: "users",
      search: " ana ",
      from: "2026-11-01",
      to: "2026-11-12",
    });
    expect(parsed).toMatchObject({
      category: "users",
      search: "ana",
      from: "2026-11-01",
      to: "2026-11-12",
    });
  });

  it.each([
    ["categoría desconocida", { category: "otra" }],
    ["fecha mal formada", { from: "12/11/2026" }],
    ["fecha inexistente", { to: "2026-13-45" }],
    ["rango invertido", { from: "2026-11-12", to: "2026-11-01" }],
    ["tamaño de página excesivo", { pageSize: "500" }],
    ["página cero", { page: "0" }],
  ])("rechaza %s", (_name, input) => {
    expect(auditLogListQuerySchema.safeParse(input).success).toBe(false);
  });
});
