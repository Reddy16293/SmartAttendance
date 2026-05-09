import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config';
import { notifySessionExpired } from './authSession';

/**
 * API Service for making HTTP requests to the backend
 * Centralized API client with consistent error handling, type safety, and token management
 */

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
  suppressErrorLog?: boolean;
}

interface ApiError {
  detail?: string;
  message?: string;
  error?: string;
}

/**
 * Parse error response body safely
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return { message: response.statusText };
  } catch {
    return { message: `HTTP ${response.status}` };
  }
}

/**
 * Generic API request function with error handling and token management
 */
async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`;
  const { suppressErrorLog = false, ...requestOptions } = options;
  
  // Fetch auth token from async storage (nullable, safe)
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem('auth_token');
  } catch (err) {
    console.warn('Failed to retrieve auth token:', err);
  }

  const headers: Record<string, string> = {
    ...options.headers,
  };

  // Only add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      headers,
    });
  } catch (err) {
    // Network error (no internet, timeout, CORS, etc.)
    const networkError = err instanceof Error ? err.message : 'Network error';
    if (!suppressErrorLog) {
      console.error(`[API] Network error on ${endpoint}:`, networkError);
    }
    throw new Error(`Network error: ${networkError}`);
  }

  // Handle non-2xx responses
  if (!response.ok) {
    const errorData = await parseErrorResponse(response);
    const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
    if (response.status === 401) {
      try {
        await AsyncStorage.removeItem('auth_token');
      } catch (err) {
        console.warn('Failed to clear expired auth token:', err);
      }

      notifySessionExpired({
        message: errorMessage,
        endpoint,
      });
    } else if (!suppressErrorLog) {
      console.error(`[API] Request failed: ${endpoint}`, {
        status: response.status,
        error: errorMessage,
      });
    }
    throw new Error(errorMessage);
  }

  // Parse response body safely (handle empty bodies gracefully)
  try {
    if (response.status === 204) {
      return null as T;
    }

    const rawBody = await response.text();
    if (!rawBody || rawBody.trim() === '') {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return JSON.parse(rawBody) as T;
    }

    // Some endpoints may return JSON without explicit content-type.
    try {
      return JSON.parse(rawBody) as T;
    } catch {
      return rawBody as T;
    }
  } catch (err) {
    const parseError = err instanceof Error ? err.message : 'Invalid response body';
    console.error(`[API] Failed to parse response from ${endpoint}:`, parseError);
    throw new Error(`Failed to parse response: ${parseError}`);
  }
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
export { config };
// For backward compatibility during migration
export const API_URL = config.apiUrl;
