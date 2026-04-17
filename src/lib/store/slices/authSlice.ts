/**
 * Redux auth slice.
 * Manages user session, tokens, and authentication state.
 * Hydrates from localStorage on initialization.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState } from '@/types/store/auth.store';
import { User } from '@/types/models/auth.model';
import Cookies from 'js-cookie';

// ─── Hydrate from localStorage/Cookies ────────────────────────────────────────
const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    };
  }

  const user = localStorage.getItem('user');
  const accessToken = Cookies.get('accessToken') || localStorage.getItem('accessToken');
  const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');

  return {
    user: user ? JSON.parse(user) : null,
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    isAuthenticated: !!accessToken,
    isLoading: false,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;

      // Persist to localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Persist to Cookies for Middleware support
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      Cookies.set('accessToken', accessToken, { expires: 7, secure: isSecure, sameSite: 'lax' });
      Cookies.set('refreshToken', refreshToken, { expires: 7, secure: isSecure, sameSite: 'lax' });
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;

      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Clear Cookies
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
