const parseError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data?.detail || "internal_error";
  }
  return "internal_error";
};

const getApiBase = () => {
  if (typeof window !== "undefined" && window.API_BASE) {
    return window.API_BASE.replace(/\/$/, "");
  }
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta?.content) {
      return meta.content.replace(/\/$/, "");
    }
  }
  return "/api";
};

export const apiRequest = async (path, options = {}) => {
  const base = getApiBase();
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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
