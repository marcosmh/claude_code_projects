// Runs once when the server starts (not during `next build`): fail fast on a missing or weak JWT_SECRET
// instead of on the first login. The error names the problem and never prints the secret.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getJwtConfig } = await import("./utils/jwt");
    getJwtConfig();
  }
}
