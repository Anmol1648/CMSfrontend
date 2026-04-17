/**
 * Centralized Axios client for all API calls.
 * - Attaches Bearer token from localStorage
 * - Handles the backend's ApiResponse envelope
 * - Auto-refreshes tokens on 401
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types/api/api.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor: Attach Token ────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Priority 1: localStorage | Priority 2: Cookies (fallback for middleware sync)
      const token = localStorage.getItem('accessToken') || Cookies.get('accessToken');

      // Safeguard: Ensure token is a legitimate non-empty string
      if (token && token !== 'null' && token !== 'undefined' && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Unwrap ApiResponse & Handle 401 ────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // The backend always wraps in ApiResponse — unwrap the data
    const apiResponse = response.data as ApiResponse;
    if (apiResponse.status === 'error') {
      return Promise.reject({
        code: apiResponse.error?.code || 'UNKNOWN_ERROR',
        message: apiResponse.error?.message || 'An error occurred',
        details: apiResponse.error?.details,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, attempt token refresh
    // Safeguard: Do NOT attempt refresh or redirect if the error came from the login or refresh endpoints
    const requestUrl = originalRequest.url || '';
    const isAuthRequest = requestUrl.includes('auth/login') || requestUrl.includes('auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post<ApiResponse>(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        if (data.status === 'success' && data.data) {
          const { accessToken, refreshToken: newRefreshToken } = data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          Cookies.set('accessToken', accessToken);
          Cookies.set('refreshToken', newRefreshToken);

          console.log('[ApiClient] Token refreshed successfully');
          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Clear auth state on refresh failure across all storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Extract error info from the backend's ApiResponse envelope
    const apiError = error.response?.data;
    return Promise.reject({
      code: apiError?.error?.code || 'NETWORK_ERROR',
      message: apiError?.error?.message || error.message || 'Network error',
      details: apiError?.error?.details,
      status: error.response?.status,
    });
  }
);

export default apiClient;
