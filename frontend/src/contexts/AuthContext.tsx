import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { UserPublic } from "../types";
import * as authService from "../services/auth";

interface AuthContextValue {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; display_name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("flicksy_token");
    const cachedUser = localStorage.getItem("flicksy_user");

    if (token && cachedUser) {
      setUser(JSON.parse(cachedUser));
      // Verify token is still valid and refresh profile counts in the background.
      authService
        .getMe()
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem("flicksy_user", JSON.stringify(freshUser));
        })
        .catch(() => {
          localStorage.removeItem("flicksy_token");
          localStorage.removeItem("flicksy_user");
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const persistSession = (token: string, freshUser: UserPublic) => {
    localStorage.setItem("flicksy_token", token);
    localStorage.setItem("flicksy_user", JSON.stringify(freshUser));
    setUser(freshUser);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    persistSession(res.access_token, res.user);
  }, []);

  const register = useCallback(
    async (data: { email: string; username: string; display_name: string; password: string }) => {
      const res = await authService.register(data);
      persistSession(res.access_token, res.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("flicksy_token");
      localStorage.removeItem("flicksy_user");
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await authService.getMe();
    setUser(freshUser);
    localStorage.setItem("flicksy_user", JSON.stringify(freshUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
