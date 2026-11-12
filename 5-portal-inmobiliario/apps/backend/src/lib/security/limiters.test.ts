import { describe, expect, it } from "vitest";
import { getClientIp } from "./limiters";

const requestWith = (headers: Record<string, string>) =>
  new Request("http://localhost/api/x", { headers });

describe("getClientIp", () => {
  it("usa el primer valor de x-forwarded-for", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
  });

  it("quita el prefijo de IPv4 mapeada en IPv6", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "::ffff:127.0.0.1" }))).toBe("127.0.0.1");
  });

  it("agrupa las peticiones sin cabecera como «desconocida»", () => {
    expect(getClientIp(requestWith({}))).toBe("desconocida");
  });
});
