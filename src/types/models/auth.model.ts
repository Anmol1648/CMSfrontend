/**
 * Auth domain models.
 * Mirrors the data structures returned by the Auth Service.
 */

export interface User {
  id: string;
  email: string;
  tenantId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  status?: 'mfa_required' | 'success';
  mfaToken?: string;
}

export interface MfaVerifyRequest {
  mfaToken: string;
  otpToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  message: string;
}
