/* ═══════════════════════════════════════════════════════════
   Zustand Store — Auth State
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import type { User } from '../types/system';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,

  login: async (username: string, password: string) => {
    // Demo mode: accept demo credentials
    if (
      (username === 'admin' && password === 'sentinel2026') ||
      (username === 'analyst' && password === 'sentinel2026') ||
      (username === 'demo' && password === 'demo')
    ) {
      const role = username === 'admin' ? 'admin' as const
        : username === 'analyst' ? 'soc_analyst' as const
        : 'viewer' as const;

      set({
        isAuthenticated: true,
        user: {
          id: 'user-1',
          username,
          email: `${username}@sentinel-x.local`,
          role,
          last_login: new Date().toISOString(),
        },
        token: 'demo-jwt-token',
      });
      return true;
    }
    return false;
  },

  logout: () => set({ isAuthenticated: false, user: null, token: null }),
}));
