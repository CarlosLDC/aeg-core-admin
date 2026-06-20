"use client";

import { useCallback, useEffect, useState } from "react";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  distributorSelectOptions,
  printerSelectOptions,
  sealSelectOptions,
  serviceCenterSelectOptions,
  technicianUserSelectOptions,
} from "@/lib/field-operations-catalog";
import { fetchPrinters } from "@/lib/printers-api";
import { applyScopedFieldCatalog } from "@/lib/scope-filters";
import { fetchSeals } from "@/lib/seals-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { fetchUsers } from "@/lib/users-api";
import type { PrinterResponse } from "@/types/printer";

export function useFieldOperationsCatalog() {
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canLoadPrinters =
    user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [loading, setLoading] = useState(true);
  const [scopedPrinters, setScopedPrinters] = useState<PrinterResponse[]>([]);
  const [printerOptions, setPrinterOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [scopedPrinterIds, setScopedPrinterIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [scopedTechnicianUserIds, setScopedTechnicianUserIds] = useState<
    Set<number>
  >(() => new Set());
  const [sealOptions, setSealOptions] = useState<SearchableSelectOption[]>([]);
  const [technicianUserOptions, setTechnicianUserOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [serviceCenterOptions, setServiceCenterOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [distributorOptions, setDistributorOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let distributorId = user.distributorId;
      let authUserId: number | null = null;
      if (user.role === "TECHNICIAN") {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? distributorId;
          authUserId = me.id;
        } catch {
          /* sin /api/auth/me */
        }
      }
      setCurrentUserId(authUserId);

      const [
        companies,
        branches,
        printersRaw,
        sealsRaw,
        technicianUsersRaw,
        centersRaw,
        distributorsRaw,
        clientsRaw,
      ] = await Promise.all([
        scope ? Promise.resolve(scope.companies) : fetchCompanies(),
        scope ? Promise.resolve(scope.branches) : fetchBranches(),
        canLoadPrinters ? fetchPrinters().catch(() => []) : Promise.resolve([]),
        fetchSeals().catch(() => []),
        fetchUsers().catch(() => []),
        fetchServiceCenters().catch(() => []),
        fetchDistributors().catch(() => []),
        fetchClients().catch(() => []),
      ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        companies,
        branches,
        clients: clientsRaw,
        distributors: distributorsRaw,
        serviceCenters: centersRaw,
        technicianUsers: technicianUsersRaw.filter(
          (row) => row.role === "TECHNICIAN" && row.enabled,
        ),
        printers: printersRaw,
        seals: sealsRaw,
      });

      setScopedPrinterIds(scoped.printerIds);
      setScopedTechnicianUserIds(
        new Set(scoped.technicianUsers.map((row) => row.id)),
      );
      setScopedPrinters(scoped.printers);
      setPrinterOptions(printerSelectOptions(scoped.printers));
      setSealOptions(sealSelectOptions(scoped.seals));
      setTechnicianUserOptions(
        technicianUserSelectOptions(scoped.technicianUsers),
      );
      setServiceCenterOptions(
        serviceCenterSelectOptions(
          scoped.serviceCenters,
          scoped.branches,
          scoped.companies,
        ),
      );
      setDistributorOptions(
        distributorSelectOptions(
          scoped.distributors,
          scoped.branches,
          scoped.companies,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [scope, canLoadPrinters, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    refresh: load,
    printerOptions,
    scopedPrinters,
    scopedPrinterIds,
    scopedTechnicianUserIds,
    sealOptions,
    technicianUserOptions,
    serviceCenterOptions,
    distributorOptions,
    canLoadPrinters,
    role: user?.role,
    distributorId: user?.distributorId ?? null,
    currentUserId,
  };
}
