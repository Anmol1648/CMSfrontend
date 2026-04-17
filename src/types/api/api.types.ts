/**
 * Mirrors the backend's standard ApiResponse from @shared/core.
 * Every API response from the gateway follows this contract.
 */

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
