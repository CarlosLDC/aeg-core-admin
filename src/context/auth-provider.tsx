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
import { refreshUserProfileFromApi } from "@/lib/auth-profile";
import { setSessionCookie } from "@/lib/session-cookie";
import {
  initialsFromUserDisplay,
  resolveUserDisplayName,
} from "@/lib/user-display";
import type { LoginRequest } from "@/types/auth";
import { getLoginErrorMessage } from "@/lib/auth";
import type { Role } from "@/types/user";

type AuthUser = {
  username: string;
  name: string | null;
  email: string;
  displayName: string;
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

function toAuthUser(session: NonNullable<ReturnType<typeof getSession>>): AuthUser {
  const displayName = resolveUserDisplayName({
    name: session.name,
    email: session.email,
    username: session.username,
  });

  return {
    username: session.username,
    name: session.name,
    email: session.email,
    displayName,
    initials: initialsFromUserDisplay({
      name: session.name,
      email: session.email,
      username: session.username,
    }),
    role: session.role,
    branchId: session.branchId,
    distributorId: session.distributorId,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setUser(null);
      return;
    }

    const profile =
      session.name?.trim()
        ? session
        : (await refreshUserProfileFromApi(session.username, session.token)) ??
          session;

    setUser(toAuthUser({ ...profile, token: session.token }));
  }, []);

  useEffect(() => {
    void (async () => {
      await syncSession();
      if (getSession()) {
        setSessionCookie(isRemembered());
      }
      setIsLoading(false);
    })();
  }, [syncSession]);

  const login = useCallback(
    async (credentials: LoginRequest, remember: boolean) => {
      await loginRequest(credentials, remember);
      await syncSession();
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
