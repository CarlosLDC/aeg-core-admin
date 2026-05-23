"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeRoleBadge } from "@/components/employees/employee-role-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableCreatedAtCell,
  TableCreatedAtHeader,
} from "@/components/ui/table-created-at";
import { TableIdCell, TableIdHeader } from "@/components/ui/table-id";
import { filterAllOption } from "@/lib/table-filter-options";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import {
  canAssignEmployeeRoles,
  canCreateEmployeeRecord,
  canUpdateEmployeeRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { branchLabelById } from "@/lib/branches";
import { filterEmployeesForDistributorStaff } from "@/lib/distributor-scope";
import { useDistributorIdState } from "@/hooks/use-distributor-id";
import { useDistributorStaffBranches } from "@/hooks/use-distributor-staff-branches";
import {
  toEmployeePayload,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  canAssignDistributorPersonRole,
  canAssignTechnicianRole,
  deleteEmployeeRoles,
  EMPLOYEE_UI_ROLE_LABELS,
  EMPLOYEE_UI_ROLES,
  fetchEmployeeRoleTables,
  getEmployeeRolesErrorMessage,
  mergeEmployeesWithRoles,
  resolveEmployeeUiRole,
  syncEmployeeRoles,
  uiRolesForUser,
  type EmployeeUiRole,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  getEmployeesErrorMessage,
  updateEmployee,
} from "@/lib/employees-api";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { EmployeeRequest } from "@/types/employee";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { employeePath } from "@/lib/resource-routes";
import { hrefForBranch } from "@/lib/table-foreign-hrefs";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type EmployeeSortKey = "id" | "createdAt";

function employeeLabel(employee: EmployeeWithRoles) {
  return `${employee.name} (${employee.nationalId})`;
}

export function EmployeesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, isLoading: authLoading } = useAuth();
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useCompanyScope();

  const isDistributor = user?.role === "DISTRIBUTOR";
  const {
    distributorId,
    loading: distributorIdLoading,
  } = useDistributorIdState();
  const {
    staffBranches,
    staffBranchIdSet,
    loading: staffBranchesLoading,
  } = useDistributorStaffBranches(isDistributor ? distributorId : null);
  const canCreate = user ? canCreateEmployeeRecord(user.role) : false;
  const canModify = user ? canUpdateEmployeeRecord(user.role) : false;
  const canEditRoles = user ? canAssignEmployeeRoles(user.role) : false;
  const showActions = canModify || canEditRoles;

  const [employees, setEmployees] = useState<EmployeeWithRoles[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<EmployeeWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("employees");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<EmployeeSortKey>>(null);

  const roleFilterOptions = useMemo(() => {
    const base = user ? uiRolesForUser(user.role) : EMPLOYEE_UI_ROLES;
    return base;
  }, [user]);

  useEffect(() => {
    if (!scope) return;
    const sortedCompanies = [...scope.companies].sort((a, b) =>
      (a.businessName || "").localeCompare(b.businessName || "", "es"),
    );
    setCompanies(sortedCompanies);
    setBranches(
      [...scope.branches].sort((a, b) =>
        branchLabelById(scope.branches, sortedCompanies, a.id).localeCompare(
          branchLabelById(scope.branches, sortedCompanies, b.id),
          "es",
        ),
      ),
    );
    if (scopeError) {
      setListError((prev) => prev ?? scopeError);
    }
  }, [scope, scopeError]);

  const formBranches = isDistributor ? staffBranches : branches;
  const displayBranches = isDistributor ? staffBranches : branches;
  const branchesReadyForCreate = isDistributor
    ? staffBranches.length > 0
    : branches.length > 0;
  const distributorBranchesReady = isDistributor
    ? !distributorIdLoading && !staffBranchesLoading
    : true;
  const defaultStaffBranchId =
    staffBranches.length === 1 ? String(staffBranches[0].id) : "";

  const scopedEmployees = useMemo(() => {
    if (user?.role === "ADMIN") return employees;
    if (user?.role === "DISTRIBUTOR") {
      return filterEmployeesForDistributorStaff(
        employees,
        "DISTRIBUTOR",
        staffBranchIdSet,
      );
    }
    const visibleBranchIds = new Set(branches.map((b) => b.id));
    return employees.filter((e) => visibleBranchIds.has(e.branchId));
  }, [employees, user?.role, staffBranchIdSet, branches]);

  const branchFilterOptions = useMemo(() => {
    const branchIds = [
      ...new Set(scopedEmployees.map((employee) => employee.branchId)),
    ].sort((a, b) =>
      branchLabelById(displayBranches, companies, a).localeCompare(
        branchLabelById(displayBranches, companies, b),
        "es",
      ),
    );
    return [
      filterAllOption("Todas las sucursales"),
      ...branchIds.map((id) => ({
        value: String(id),
        label: branchLabelById(displayBranches, companies, id),
      })),
    ];
  }, [scopedEmployees, displayBranches, companies]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedEmployees.filter((employee) => {
      if (
        branchFilter !== "all" &&
        employee.branchId !== Number(branchFilter)
      ) {
        return false;
      }
      if (
        roleFilter !== "all" &&
        resolveEmployeeUiRole(employee) !== roleFilter
      ) {
        return false;
      }
      if (!q) return true;
      const branch = branchLabelById(
        displayBranches,
        companies,
        employee.branchId,
      );
      const haystack = [
        employee.id,
        employee.nationalId,
        employee.name,
        employee.phone,
        employee.email,
        employee.type,
        branch,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    scopedEmployees,
    search,
    roleFilter,
    branchFilter,
    branches,
    staffBranches,
    companies,
  ]);

  const sortedEmployees = useMemo(
    () =>
      sortTableRows(filteredEmployees, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredEmployees, sort],
  );

  const pagination = usePagination(sortedEmployees);

  const loadEmployees = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setListError(null);
    try {
      const employeeRows = await fetchEmployees();
      const { technicians, distributorPersons } = await fetchEmployeeRoleTables(
        user.role,
      );

      const merged = mergeEmployeesWithRoles(
        employeeRows,
        technicians,
        distributorPersons,
      );

      setEmployees(
        merged.sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
    } catch (err) {
      const message = getEmployeesErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshScope(), loadEmployees()]);
  }, [refreshScope, loadEmployees]);

  useEffect(() => {
    if (authLoading || scopeLoading) return;
    if (!scope || !user) {
      setLoading(false);
      return;
    }
    void loadEmployees();
  }, [authLoading, scopeLoading, scope, user, loadEmployees]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(employee: EmployeeWithRoles) {
    setSelected(employee);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: EmployeeFormValues) {
    const editingRolesOnly = dialog === "edit" && !canModify && canEditRoles;

    if (dialog === "edit" && !canModify && !canEditRoles) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    if (
      values.role === "tecnico_operativo" &&
      user &&
      !canAssignTechnicianRole(user.role)
    ) {
      setFormError("No tienes permiso para asignar el rol técnico.");
      return;
    }

    if (
      values.role === "persona_distribuidor" &&
      user &&
      !canAssignDistributorPersonRole(user.role)
    ) {
      setFormError("No tienes permiso para asignar persona distribuidor.");
      return;
    }

    let body: EmployeeRequest | undefined;
    let tableRoles = { isTechnician: false, isDistributorPerson: false };

    if (!editingRolesOnly) {
      const payload = toEmployeePayload(values);
      if (typeof payload === "string") {
        setFormError(payload);
        return;
      }
      if (user?.role === "DISTRIBUTOR") {
        if (!staffBranchIdSet.has(payload.request.branchId)) {
          setFormError(
            "Solo puedes registrar empleados en la sucursal de tu distribuidora.",
          );
          return;
        }
      } else if (user?.role !== "ADMIN") {
        const visibleBranchIds = new Set(branches.map((b) => b.id));
        if (!visibleBranchIds.has(payload.request.branchId)) {
          setFormError("La sucursal seleccionada no está dentro de tu alcance.");
          return;
        }
      }
      body = payload.request;
      tableRoles = payload.tableRoles;
    } else {
      const payload = toEmployeePayload({
        ...values,
        nationalId: selected?.nationalId ?? "",
        name: selected?.name ?? "",
        phone: selected?.phone ?? "",
        email: selected?.email ?? "",
        branchId: selected ? String(selected.branchId) : "",
      });
      if (typeof payload === "string") {
        setFormError(payload);
        return;
      }
      tableRoles = payload.tableRoles;
    }

    setSaving(true);
    setFormError(null);
    const label = body?.name ?? selected?.name ?? "empleado";

    try {
      if (dialog === "create" && body) {
        const created = await createEmployee(body);
        await syncEmployeeRoles(created.id, null, tableRoles);
        toast.success(`Empleado "${label}" creado correctamente.`, {
          href: employeePath(created.id),
        });
      } else if (selected) {
        if (body && canModify) {
          await updateEmployee(selected.id, body);
        }
        await syncEmployeeRoles(selected.id, selected, tableRoles);
        toast.success(
          editingRolesOnly
            ? `Rol de "${label}" actualizado.`
            : `Empleado "${label}" actualizado.`,
          { href: employeePath(selected.id) },
        );
      }
      closeDialog();
      await loadEmployees();
    } catch (err) {
      const message =
        getEmployeesErrorMessage(err) || getEmployeeRolesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(employee: EmployeeWithRoles, fromDialog = false) {
    if (!canModify) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = employeeLabel(employee);
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar al empleado "${label}"? Puede afectar técnicos o inspecciones vinculadas.`, destructive: true }))) {
      return;
    }
    setDeletingId(employee.id);
    try {
      await deleteEmployeeRoles(employee);
      await deleteEmployee(employee.id);
      if (fromDialog) closeDialog();
      await loadEmployees();
      toast.success(`Empleado "${label}" eliminado.`);
    } catch (err) {
      const message = getEmployeesErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  const catalogReady = !scopeLoading && scope != null;

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          <>
            <button
              type="button"
              onClick={refreshAll}
              disabled={loading || scopeLoading || authLoading}
              className={cn(
                pageToolbarButtonClass,
                "border border-border bg-card text-foreground hover:bg-foreground/5 disabled:opacity-50",
              )}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  (loading || scopeLoading) && "animate-spin",
                )}
              />
              Actualizar
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                disabled={!catalogReady || !branchesReadyForCreate}
                className={cn(
                  pageToolbarButtonClass,
                  "bg-accent text-accent-foreground disabled:opacity-50",
                )}
              >
                <Plus className="size-4" />
                Nuevo empleado
              </button>
            )}
          </>
        }
      />

      {!branchesReadyForCreate && catalogReady && distributorBranchesReady && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {isDistributor
            ? "Tu usuario no tiene una sucursal de distribuidora vinculada. Contacta a un administrador."
            : "Registra al menos una sucursal antes de dar de alta empleados."}
        </p>
      )}

      {listError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading || scopeLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando empleados…
          </div>
        ) : scopedEmployees.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay empleados en las sucursales visibles.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, cédula, correo o sucursal…"
              resultCount={filteredEmployees.length}
              totalCount={scopedEmployees.length}
              filters={[
                {
                  id: "role",
                  label: "Rol",
                  value: roleFilter,
                  onChange: setRoleFilter,
                  options: [
                    filterAllOption(),
                    ...roleFilterOptions.map((role) => ({
                      value: role,
                      label: EMPLOYEE_UI_ROLE_LABELS[role as EmployeeUiRole],
                    })),
                  ],
                },
                {
                  id: "branch",
                  label: "Sucursal",
                  value: branchFilter,
                  onChange: setBranchFilter,
                  options: branchFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredEmployees.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Nombre</th>
                        <th className="px-5 py-3 font-medium">Cédula</th>
                        <th className="px-5 py-3 font-medium">Rol</th>
                        <th className="px-5 py-3 font-medium">Sucursal</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        {tableColumns.showId && (
                          <TableIdHeader
                            sortDirection={sort?.key === "id" ? sort.direction : null}
                            onSortToggle={() =>
                              setSort((current) => toggleTableSort(current, "id"))
                            }
                          />
                        )}
                        {tableColumns.showCreatedAt && (
                          <TableCreatedAtHeader
                            sortDirection={
                              sort?.key === "createdAt" ? sort.direction : null
                            }
                            onSortToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "createdAt"),
                              )
                            }
                          />
                        )}
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((employee) => (
                        <ClickableTableRow
                          key={employee.id}
                          href={employeePath(employee.id)}
                        >
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            {employee.name}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-card-foreground">
                            {employee.nationalId}
                          </td>
                          <td className="px-5 py-3.5">
                            <EmployeeRoleBadge employee={employee} />
                          </td>
                          <td className="max-w-[200px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText
                              href={
                                user
                                  ? hrefForBranch(employee.branchId, user.role)
                                  : undefined
                              }
                              maxClassName="max-w-[180px]"
                            >
                              {branchLabelById(
                                displayBranches,
                                companies,
                                employee.branchId,
                              )}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[200px] px-5 text-muted">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {employee.phone || employee.email || "—"}
                            </TruncatedText>
                          </td>
                          {tableColumns.showId && (
                            <TableIdCell value={employee.id} />
                          )}
                          {tableColumns.showCreatedAt && (
                            <TableCreatedAtCell value={employee.createdAt} />
                          )}
                          <td className="px-5 py-3.5" data-row-click="ignore">
                            <TableRowActionsMenu
                              viewHref={employeePath(employee.id)}
                              viewLabel={`Ver empleado ${employee.name}`}
                              onEdit={
                                showActions
                                  ? () => openEdit(employee)
                                  : undefined
                              }
                              onDelete={
                                canModify
                                  ? () => handleDelete(employee)
                                  : undefined
                              }
                              deleting={deletingId === employee.id}
                            />
                          </td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
            <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      {dialog !== null && user && (
        <EmployeeFormDialog
          mode={dialog === "create" ? "create" : "edit"}
          employee={selected ?? undefined}
          userRole={user.role}
          branches={formBranches}
          companies={companies}
          branchesLoading={
            isDistributor ? staffBranchesLoading : scopeLoading
          }
          defaultBranchId={defaultStaffBranchId}
          lockBranch={isDistributor && staffBranches.length === 1}
          open={dialog !== null}
          saving={saving}
          error={formError}
          onClose={closeDialog}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
