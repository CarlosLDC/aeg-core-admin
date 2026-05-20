"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/auth-provider";
import { buildCompanyScope, type CompanyScope } from "@/lib/company-scope";
import {
  invalidateCatalogRoles,
  loadCatalogRoles,
  type CatalogRolesSnapshot,
} from "@/lib/catalog-roles-cache";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";

type CompanyScopeContextValue = {
  scope: CompanyScope | null;
  catalogRoles: CatalogRolesSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const CompanyScopeContext = createContext<CompanyScopeContextValue | null>(
  null,
);

export function CompanyScopeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [scope, setScope] = useState<CompanyScope | null>(null);
  const [catalogRoles, setCatalogRoles] =
    useState<CatalogRolesSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setScope(null);
      setCatalogRoles(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    invalidateCatalogRoles();
    try {
      const [companies, branches, roles] = await Promise.all([
        fetchCompanies(),
        fetchBranches(),
        loadCatalogRoles(true),
      ]);

      const built = buildCompanyScope({
        role: user.role,
        branchId: user.branchId,
        distributorId: user.distributorId,
        companies,
        branches,
      });

      setScope(built);
      setCatalogRoles(roles);
    } catch (err) {
      setScope(null);
      setCatalogRoles(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el alcance de empresas",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ scope, catalogRoles, loading, error, refresh }),
    [scope, catalogRoles, loading, error, refresh],
  );

  return (
    <CompanyScopeContext.Provider value={value}>
      {children}
    </CompanyScopeContext.Provider>
  );
}

export function useCompanyScope() {
  const context = useContext(CompanyScopeContext);
  if (!context) {
    throw new Error(
      "useCompanyScope debe usarse dentro de CompanyScopeProvider",
    );
  }
  return context;
}
