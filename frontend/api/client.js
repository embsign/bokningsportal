let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const agentDebugLog = (payload) => {
  const entry = {
    hypothesisId: payload?.hypothesisId || "unknown",
    location: payload?.location || "unknown",
    message: payload?.message || "",
    data: payload?.data || {},
    timestamp: Date.now(),
  };
  const line = `${JSON.stringify(entry)}\n`;
  try {
    if (typeof require === "function") {
      const fs = require("fs");
      if (fs?.appendFileSync) {
        fs.appendFileSync("/opt/cursor/logs/debug.log", line);
        return;
      }
    }
  } catch {
    // Ignore and fallback to console in browser runtimes.
  }
  try {
    console.log(line.trim());
  } catch {
    // Ignore logging failures.
  }
};

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
  const headers = new Headers(options.headers || {});
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  // #region agent log
  agentDebugLog({
    hypothesisId: "H1",
    location: "frontend/api/client.js:apiRequest:entry",
    message: "apiRequest entry",
    data: {
      path,
      method: options.method || "GET",
      cacheOption: options.cache || "default",
      hasBody: Boolean(options.body),
    },
  });
  // #endregion
  const response = await fetch(`${base}${path}`, {
    headers,
    ...options,
  });
  // #region agent log
  agentDebugLog({
    hypothesisId: "H1",
    location: "frontend/api/client.js:apiRequest:response",
    message: "apiRequest response",
    data: {
      path,
      method: options.method || "GET",
      status: response.status,
      cacheControl: response.headers.get("cache-control") || "",
      age: response.headers.get("age") || "",
      date: response.headers.get("date") || "",
    },
  });
  // #endregion

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
