const parseError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data?.detail || "internal_error";
  }
  return "internal_error";
};

const isLocalHost = (hostname) => hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const isLocalApiBase = (value) => {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(value, origin);
    return isLocalHost(url.hostname);
  } catch {
    return false;
  }
};

const getApiBase = () => {
  if (typeof window !== "undefined" && window.API_BASE) {
    return window.API_BASE.replace(/\/$/, "");
  }
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta?.content) {
      const value = meta.content.replace(/\/$/, "");
      // Skyddar deploy-miljö mot felaktigt kvarlämnad localhost-konfiguration.
      if (
        typeof window !== "undefined" &&
        !isLocalHost(window.location.hostname) &&
        isLocalApiBase(value)
      ) {
        return "/api";
      }
      return value;
    }
  }
  return "/api";
};

export const apiRequest = async (path, options = {}) => {
  const base = getApiBase();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  if (!response.ok) {
    const detail = await parseError(response);
    const error = new Error(detail);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};
