/**
 * API Service for making HTTP requests to the backend
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Generic API request function
 */
async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem("auth_token");

  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

const api = {
  /**
   * GET request
   */
  get: <T,>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  /**
   * POST request
   */
  post: <T,>(endpoint: string, data?: any, options?: FetchOptions) => {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = !(data instanceof FormData)
      ? { "Content-Type": "application/json", ...options?.headers }
      : options?.headers;

    return request<T>(endpoint, {
      ...options,
      method: "POST",
      body,
      headers,
    });
  },

  /**
   * PUT request
   */
  put: <T,>(endpoint: string, data?: any, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),

  /**
   * DELETE request
   */
  delete: <T,>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  /**
   * PATCH request
   */
  patch: <T,>(endpoint: string, data?: any, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),
};

export default api;
