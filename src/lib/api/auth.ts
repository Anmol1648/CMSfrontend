import { api, TokenBundle } from './client';

/** Calls to /api/auth (see cmsbackend/src/modules/auth). */

export type UserKind = 'admin' | 'staff' | 'student' | 'guardian';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  mobile: string | null;
  kind: UserKind;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface SignedIn extends TokenBundle {
  mfaRequired: false;
  user: UserSummary;
  mustChangePassword: boolean;
}

export type LoginResult = SignedIn | { mfaRequired: true; mfaToken: string };

export interface Me {
  user: UserSummary;
  roles: { slug: string; name: string }[];
  school: { code: string; name: string; legalName: string } | null;
  mustChangePassword: boolean;
}

export interface DeviceSession {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface MfaSetup {
  secret: string;
  qrCodeDataUrl: string;
  otpauth: string;
}

export const authApi = {
  login: (identifier: string, password: string, rememberMe: boolean) =>
    api.post<LoginResult>('/auth/login', { identifier, password, rememberMe }),
  verifyMfa: (mfaToken: string, code: string) => api.post<SignedIn>('/auth/mfa/verify', { mfaToken, code }),
  me: () => api.get<Me>('/auth/me'),
  logout: () => api.post<object>('/auth/logout'),
  logoutAll: () => api.post<{ sessions: number }>('/auth/logout-all'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<TokenBundle>('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (identifier: string) => api.post<{ message: string }>('/auth/forgot-password', { identifier }),
  resetPassword: (identifier: string, code: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { identifier, code, newPassword }),
  sessions: () => api.get<DeviceSession[]>('/auth/sessions'),
  endSession: (id: string) => api.delete<object>(`/auth/sessions/${id}`),
  startMfaSetup: () => api.post<MfaSetup>('/auth/mfa/setup'),
  enableMfa: (code: string) => api.post<object>('/auth/mfa/enable', { code }),
  disableMfa: (password: string, code: string) => api.post<object>('/auth/mfa/disable', { password, code }),
};
