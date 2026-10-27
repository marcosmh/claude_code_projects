// Runs once when the server starts (not during `next build`): fail fast on a missing or weak JWT secret, or on a
// FRONTEND_ORIGIN that is not acceptable in production, instead of on the first login. Errors name the problem and
// never print a secret.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getJwtConfig } = await import("./utils/jwt");
    getJwtConfig();
    const { assertProductionOrigins } = await import("./utils/cors");
    assertProductionOrigins();
  }
}
