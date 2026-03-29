let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

const parseError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data?.detail || "internal_error";
  }
  return "internal_error";
};

export const getApiBase = () => "/api";

export const apiRequest = async (path, options = {}) => {
  const base = getApiBase();
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const fetchOptions = {
    ...options,
    method,
    headers,
  };
  if (method === "GET" && fetchOptions.cache === undefined) {
    fetchOptions.cache = "no-store";
  }
  const response = await fetch(`${base}${path}`, fetchOptions);

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
