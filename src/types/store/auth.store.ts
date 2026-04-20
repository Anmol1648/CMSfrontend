/**
 * Redux auth slice state shape.
 */

import { User } from '../models/auth.model';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: any[];
  menus: any[];
  isAuthenticated: boolean;
  isLoading: boolean;
}
