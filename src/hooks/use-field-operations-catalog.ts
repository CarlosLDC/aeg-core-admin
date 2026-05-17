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
import { fetchEmployees } from "@/lib/employees-api";
import {
  distributorSelectOptions,
  employeeSelectOptions,
  printerSelectOptions,
  sealSelectOptions,
  serviceCenterSelectOptions,
  technicianSelectOptions,
} from "@/lib/field-operations-catalog";
import { fetchPrinters } from "@/lib/printers-api";
import { applyScopedFieldCatalog } from "@/lib/scope-filters";
import { fetchSeals } from "@/lib/seals-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { fetchTechnicians } from "@/lib/technicians-api";

export function useFieldOperationsCatalog() {
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canLoadPrinters =
    user?.role === "ADMIN" ||
    user?.role === "DISTRIBUTOR" ||
    user?.role === "TECHNICIAN";

  const [loading, setLoading] = useState(true);
  const [printerOptions, setPrinterOptions] = useState<SearchableSelectOption[]>(
    [],
  );
  const [scopedPrinterIds, setScopedPrinterIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [scopedEmployeeIds, setScopedEmployeeIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [sealOptions, setSealOptions] = useState<SearchableSelectOption[]>([]);
  const [technicianOptions, setTechnicianOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [employeeOptions, setEmployeeOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [serviceCenterOptions, setServiceCenterOptions] = useState<
    SearchableSelectOption[]
  >([]);
  const [distributorOptions, setDistributorOptions] = useState<
    SearchableSelectOption[]
  >([]);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let distributorId = user.distributorId;
      if (user.role === "DISTRIBUTOR" && distributorId == null) {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? null;
        } catch {
          /* sin /api/auth/me */
        }
      }

      const [
        companies,
        branches,
        printersRaw,
        sealsRaw,
        techniciansRaw,
        employeesRaw,
        centersRaw,
        distributorsRaw,
        clientsRaw,
      ] = await Promise.all([
        scope ? Promise.resolve(scope.companies) : fetchCompanies(),
        scope ? Promise.resolve(scope.branches) : fetchBranches(),
        canLoadPrinters ? fetchPrinters().catch(() => []) : Promise.resolve([]),
        fetchSeals().catch(() => []),
        fetchTechnicians().catch(() => []),
        fetchEmployees().catch(() => []),
        fetchServiceCenters().catch(() => []),
        fetchDistributors().catch(() => []),
        fetchClients().catch(() => []),
      ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        userBranchId: user.branchId,
        companies,
        branches,
        clients: clientsRaw,
        distributors: distributorsRaw,
        serviceCenters: centersRaw,
        employees: employeesRaw,
        technicians: techniciansRaw,
        printers: printersRaw,
        seals: sealsRaw,
      });

      setScopedPrinterIds(scoped.printerIds);
      setScopedEmployeeIds(new Set(scoped.employees.map((e) => e.id)));
      setPrinterOptions(printerSelectOptions(scoped.printers));
      setSealOptions(sealSelectOptions(scoped.seals));
      setTechnicianOptions(
        technicianSelectOptions(scoped.technicians, scoped.employees),
      );
      setEmployeeOptions(employeeSelectOptions(scoped.employees));
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
    scopedPrinterIds,
    scopedEmployeeIds,
    sealOptions,
    technicianOptions,
    employeeOptions,
    serviceCenterOptions,
    distributorOptions,
    canLoadPrinters,
    role: user?.role,
    distributorId: user?.distributorId ?? null,
  };
}
