/**
 * Auth API endpoints.
 * Each function is a thin wrapper around the apiClient that returns typed data.
 */

import apiClient from '../clients/apiClient';
import { ApiResponse } from '@/types/api/api.types';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshRequest, 
  RefreshResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthMessageResponse
} from '@/types/models/auth.model';

export const authApi = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return data.data!;
  },

  mfaVerify: async (mfaToken: string, otpToken: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/mfa/verify', { mfaToken, otpToken });
    return data.data!;
  },

  refresh: async (payload: RefreshRequest): Promise<RefreshResponse> => {
    const { data } = await apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh', payload);
    return data.data!;
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<AuthMessageResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthMessageResponse>>('/auth/forgot-password', payload);
    return data.data!;
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<AuthMessageResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthMessageResponse>>('/auth/reset-password', payload);
    return data.data!;
  },

  logout: async (refreshToken: string): Promise<AuthMessageResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthMessageResponse>>('/auth/logout', { refreshToken });
    return data.data!;
  },

  logoutAll: async (): Promise<AuthMessageResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthMessageResponse>>('/auth/logout-all', {});
    return data.data!;
  },
};

