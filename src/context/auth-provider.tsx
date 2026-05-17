"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getSession, login as loginRequest, logout as logoutSession } from "@/lib/auth";
import { isRemembered } from "@/lib/auth-storage";
import { setSessionCookie } from "@/lib/session-cookie";
import { getInitials } from "@/lib/jwt";
import type { LoginRequest } from "@/types/auth";
import { getLoginErrorMessage } from "@/lib/auth";
import type { Role } from "@/types/user";

type AuthUser = {
  username: string;
  initials: string;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginRequest, remember: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(() => {
    const session = getSession();
    if (!session) {
      setUser(null);
      return;
    }
    setUser({
      username: session.username,
      initials: getInitials(session.username),
      role: session.role,
      branchId: session.branchId,
      distributorId: session.distributorId,
    });
  }, []);

  useEffect(() => {
    syncSession();
    if (getSession()) {
      setSessionCookie(isRemembered());
    }
    setIsLoading(false);
  }, [syncSession]);

  const login = useCallback(
    async (credentials: LoginRequest, remember: boolean) => {
      await loginRequest(credentials, remember);
      syncSession();
    },
    [syncSession],
  );

  const logout = useCallback(() => {
    logoutSession();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

export { getLoginErrorMessage };
