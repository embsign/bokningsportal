import { router } from "../../backend/src/worker/router.js";
import { Env } from "../../backend/src/worker/types.js";

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

export const onRequest = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request) || undefined,
    });
  }

  try {
    const response =
      (await router(request, env)) ||
      new Response(JSON.stringify({ detail: "internal_error" }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    return withCors(request, response);
  } catch {
    const response = new Response(JSON.stringify({ detail: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    return withCors(request, response);
  }
};
