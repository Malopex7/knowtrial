import { create } from 'zustand';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  // ── Login ────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Login failed');
      }

      const { token, ...user } = json.data;

      localStorage.setItem(TOKEN_KEY, token);
      set({ token, user, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
    }
  },

  // ── Logout ───────────────────────────────────
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, error: null });
  },

  // ── Hydrate (restore session on app mount) ───
  hydrate: async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;

    set({ isLoading: true });

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Token expired or invalid — clean up silently
        get().logout();
        return;
      }

      set({ token: stored, user: json.data, isLoading: false });
    } catch {
      // Network error — clear stale session
      get().logout();
    }
  },

  // ── Clear error ──────────────────────────────
  clearError: () => set({ error: null }),
}));
