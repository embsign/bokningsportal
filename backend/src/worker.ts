import { initDb } from "./worker/db/init.js";
import { router } from "./worker/router.js";
import { Env } from "./worker/types.js";

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }
  const requestHeaders = request.headers.get("access-control-request-headers");
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", requestHeaders || "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  return headers;
};

const withCors = (request: Request, response: Response) => {
  const corsHeaders = getCorsHeaders(request);
  if (!corsHeaders) {
    return response;
  }
  const headers = new Headers(response.headers);
  corsHeaders.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  fetch: async (request: Request, env: Env) => {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request) || undefined,
      });
    }

    try {
      await initDb(env.DB);
      const response =
        (await router(request, env)) ||
        new Response(JSON.stringify({ detail: "internal_error" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      return withCors(request, response);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error ? String((error as any).message) : "unknown";
      const response = new Response(JSON.stringify({ detail: `internal_error:${message}` }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
      return withCors(request, response);
    }
  },
};
