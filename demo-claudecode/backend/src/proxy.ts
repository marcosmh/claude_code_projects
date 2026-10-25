import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders } from "./utils/cors";

// Next 16 renamed `middleware` to `proxy`. Handles CORS (incl. preflight) for the API.
export function proxy(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

export const config = { matcher: "/api/:path*" };
