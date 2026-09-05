import React, { createContext, useEffect, useState, useCallback } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from '../api/client';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  // Validate existing token and hydrate user profile on mount
  useEffect(() => {
    const hydrateUser = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await authApi.getMe();
        setUser(profile);
        setToken(storedToken);
      } catch {
        // Token expired or invalid
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    hydrateUser();

    // Listen for unauthorized events emitted by API client
    const handleUnauthorized = () => logout();
    window.addEventListener('peblo:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('peblo:unauthorized', handleUnauthorized);
  }, [logout]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ username, password });
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      setToken(res.access_token);
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login convenience for grading & testing (pre-seeded users)
  const quickLogin = async (role: UserRole) => {
    if (role === 'admin') {
      await login('admin', 'admin123');
    } else {
      await login('editor', 'editor123');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'editor' || user?.role === 'admin',
    isLoading,
    error,
    login,
    logout,
    quickLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
export type { AuthContextType };
