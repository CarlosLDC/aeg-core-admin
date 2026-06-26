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
import { isDistributorPanelRole } from "@/types/user";

export function useFieldOperationsCatalog() {
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canLoadPrinters =
    user?.role === "ADMIN" ||
    isDistributorPanelRole(user?.role) ||
    user?.role === "SERVICE_CENTER";

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
  const [inspectorUserOptions, setInspectorUserOptions] = useState<
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
      let authUserId: number | null = user.id ?? null;
      if (isDistributorPanelRole(user.role) || user.role === "SERVICE_CENTER") {
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
        usersRaw,
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

      const technicianUsersRaw = usersRaw.filter(
        (row) => row.role === "TECHNICIAN" && row.enabled,
      );
      const inspectorUsersRaw = usersRaw.filter(
        (row) =>
          row.enabled &&
          (row.role === "DISTRIBUTOR" ||
            row.role === "TECHNICIAN" ||
            row.role === "SERVICE_CENTER"),
      );

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        currentUserId: authUserId,
        companies,
        branches,
        clients: clientsRaw,
        distributors: distributorsRaw,
        serviceCenters: centersRaw,
        technicianUsers: technicianUsersRaw,
        inspectorUsers: inspectorUsersRaw,
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
      setInspectorUserOptions(
        technicianUserSelectOptions(scoped.inspectorUsers),
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
    inspectorUserOptions,
    serviceCenterOptions,
    distributorOptions,
    canLoadPrinters,
    role: user?.role,
    distributorId: user?.distributorId ?? null,
    currentUserId,
  };
}
