import { allowedOrigins } from "./cors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * True when a request authenticated by an ambient cookie may proceed. Reads are always fine (no side effects).
 * A write needs proof that the browser sent it from our own frontend: an allowed `Origin`, or, when the browser
 * sends none, a same-origin (or user-initiated) Fetch Metadata value. `same-site` is refused: a sibling subdomain
 * is same-site but not our frontend. A write with neither (and a cookie) is refused.
 * `proxy.ts` already rejects foreign origins and `Sec-Fetch-Site: cross-site`; this closes the "no headers at all" gap
 * for cookie credentials only, so Bearer clients (curl, Postman) are unaffected.
 */
export function isSameSiteWrite(request: Request, allowed = allowedOrigins()): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) return allowed.includes(origin);
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}
