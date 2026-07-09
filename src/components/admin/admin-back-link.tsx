"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminBackLink = {
  href: string;
  label: string;
};

type AdminBackLinkContextValue = {
  backLink: AdminBackLink | null;
  setBackLink: (link: AdminBackLink | null) => void;
};

const AdminBackLinkContext = createContext<AdminBackLinkContextValue | null>(
  null,
);

function syncBackLinkLayoutClass(active: boolean) {
  document.documentElement.classList.toggle("admin-has-back-link", active);
}

export function AdminBackLinkProvider({ children }: { children: ReactNode }) {
  const [backLink, setBackLink] = useState<AdminBackLink | null>(null);
  const value = useMemo(
    () => ({
      backLink,
      setBackLink,
    }),
    [backLink],
  );

  useEffect(() => {
    syncBackLinkLayoutClass(backLink != null);
    return () => syncBackLinkLayoutClass(false);
  }, [backLink]);

  return (
    <AdminBackLinkContext.Provider value={value}>
      {children}
    </AdminBackLinkContext.Provider>
  );
}

export function useAdminBackLink(): AdminBackLink | null {
  return useContext(AdminBackLinkContext)?.backLink ?? null;
}

export function useRegisterAdminBackLink(
  href?: string,
  label = "Volver",
): void {
  const context = useContext(AdminBackLinkContext);

  useEffect(() => {
    if (!context) return;

    if (!href) {
      context.setBackLink(null);
      return;
    }

    context.setBackLink({ href, label });
    return () => context.setBackLink(null);
  }, [context, href, label]);
}
