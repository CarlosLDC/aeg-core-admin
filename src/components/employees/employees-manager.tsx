"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { filterAllOption } from "@/lib/table-filter-options";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { reportListTableError } from "@/lib/api-error-message";
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
  canCreateEmployeeRecord,
  canUpdateEmployeeRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { companyNameById, companySearchTextById } from "@/lib/branches";
import { resolveEmployeeCompanyId } from "@/lib/employee-company";
import {
  toEmployeePayload,
  toModificationProposedData,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  getEmployeesErrorMessage,
  requestEmployeeDelete,
  requestEmployeeUpdate,
  updateEmployee,
} from "@/lib/employees-api";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { employeePath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type EmployeeSortKey = "id" | "createdAt";

function employeeLabel(employee: EmployeeWithRoles) {
  return `${employee.name} (${employee.nationalId})`;
}

function isPendingReview(employee: EmployeeWithRoles): boolean {
  return employee.reviewStatus === "PENDING_REVIEW";
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

  const canCreate = user ? canCreateEmployeeRecord(user.role) : false;
  const canModify = user ? canUpdateEmployeeRecord(user.role) : false;
  const canRequestReview = user?.role === "DISTRIBUTOR";
  const showActions = canModify || canRequestReview;

  const [employees, setEmployees] = useState<EmployeeWithRoles[]>([]);
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
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<EmployeeSortKey>>(null);

  useEffect(() => {
    if (!scope) return;
    const sortedCompanies = [...scope.companies].sort((a, b) =>
      (a.businessName || "").localeCompare(b.businessName || "", "es"),
    );
    setCompanies(sortedCompanies);
    if (scopeError) {
      setListError((prev) => prev ?? scopeError);
    }
  }, [scope, scopeError]);

  const scopedEmployees = useMemo(() => {
    if (!scope) return [];
    return employees.filter((employee) => {
      const companyId = resolveEmployeeCompanyId(employee, scope.branches);
      if (companyId == null) return false;
      return scope.companyIds.has(companyId);
    });
  }, [employees, scope]);

  const companyFilterOptions = useMemo(() => {
    const companyIds = [...new Set(
      scopedEmployees
        .map((employee) => resolveEmployeeCompanyId(employee, scope?.branches ?? []))
        .filter((id): id is number => id != null),
    )].sort((a, b) =>
      companyNameById(companies, a).localeCompare(companyNameById(companies, b), "es"),
    );
    return [
      filterAllOption("Todas las empresas"),
      ...companyIds.map((id) => ({
        value: String(id),
        label: companyNameById(companies, id),
      })),
    ];
  }, [scopedEmployees, companies, scope]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedEmployees.filter((employee) => {
      const companyId = resolveEmployeeCompanyId(employee, scope?.branches ?? []);
      if (companyId == null) return false;
      if (
        companyFilter !== "all" &&
        companyId !== Number(companyFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const company = companySearchTextById(companies, companyId);
      const haystack = [
        employee.id,
        employee.nationalId,
        employee.name,
        employee.phone,
        employee.email,
        company,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    scopedEmployees,
    search,
    companyFilter,
    companies,
    scope,
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

  const loadEmployees = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      setEmployees(
        (await fetchEmployees()).sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
    } catch (err) {
      reportListTableError({
        message: getEmployeesErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast, user]);

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
    if (dialog === "edit" && selected && isPendingReview(selected)) {
      setFormError("Este empleado tiene una solicitud pendiente de aprobación.");
      return;
    }

    if (dialog === "edit" && !canModify && !canRequestReview) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const payload = toEmployeePayload(values);
    if (typeof payload === "string") {
      setFormError(payload);
      return;
    }
    const body = payload.request;
    if (scope && !scope.companyIds.has(body.companyId)) {
      setFormError("La empresa seleccionada no está dentro de tu alcance.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = body?.name ?? selected?.name ?? "empleado";

    try {
      if (dialog === "create" && body) {
        const created = await createEmployee(body);
        toast.success(`Empleado "${label}" creado correctamente.`, {
          href: employeePath(created.id),
        });
      } else if (selected) {
        if (canRequestReview) {
          await requestEmployeeUpdate(
            selected.id,
            toModificationProposedData(body),
          );
          toast.success(
            `Solicitud de actualización para "${label}" enviada a revisión.`,
            { href: employeePath(selected.id) },
          );
        } else {
          if (canModify) {
            await updateEmployee(selected.id, body);
          }
          toast.success(`Empleado "${label}" actualizado.`, {
            href: employeePath(selected.id),
          });
        }
      }
      closeDialog();
      await loadEmployees();
    } catch (err) {
      const message = getEmployeesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(employee: EmployeeWithRoles, fromDialog = false) {
    if (!canModify && !canRequestReview) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (isPendingReview(employee)) {
      toast.error("Este empleado ya tiene una solicitud pendiente de aprobación.");
      return;
    }
    const label = employeeLabel(employee);
    const message = canRequestReview
      ? `¿Solicitar eliminación para "${label}"? Un administrador debe aprobar la solicitud.`
      : `¿Eliminar al empleado "${label}"? Puede afectar técnicos o inspecciones vinculadas.`;
    if (!(await confirm({ title: "Confirmar", message, destructive: true }))) {
      return;
    }
    setDeletingId(employee.id);
    try {
      if (canRequestReview) {
        await requestEmployeeDelete(employee.id);
      } else {
        await deleteEmployee(employee.id);
      }
      if (fromDialog) closeDialog();
      await loadEmployees({ silent: true });
      toast.success(
        canRequestReview
          ? `Solicitud de eliminación para "${label}" enviada a revisión.`
          : `Empleado "${label}" eliminado.`,
      );
    } catch (err) {
      reportListTableError({
        message: getEmployeesErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const catalogReady = !scopeLoading && scope != null;

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              disabled={!catalogReady}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground disabled:opacity-50",
              )}
            >
              <Plus className="size-4" />
              Nuevo empleado
            </button>
          ) : undefined
        }
      />

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
          <EmptyState title="No hay empleados en las empresas visibles." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, cédula, correo o empresa…"
              resultCount={filteredEmployees.length}
              totalCount={scopedEmployees.length}
              filters={[
                {
                  id: "company",
                  label: "Empresa",
                  value: companyFilter,
                  onChange: setCompanyFilter,
                  options: companyFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredEmployees.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={tableColumns.showCreatedAt}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "id"),
                              ),
                          }}
                          createdAtSort={{
                            sortDirection:
                              sort?.key === "createdAt" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "createdAt"),
                              ),
                          }}
                          actions={
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                        <th className="px-5 py-3 font-medium">Nombre</th>
                        <th className="px-5 py-3 font-medium">Cédula</th>
                        <th className="px-5 py-3 font-medium">Empresa</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((employee) => (
                        <ClickableTableRow
                          key={employee.id}
                          href={employeePath(employee.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={employee.id}
                            createdAt={employee.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={employeePath(employee.id)}
                                  viewLabel={`Ver empleado ${employee.name}`}
                                  onEdit={
                                    showActions && !isPendingReview(employee)
                                      ? () => openEdit(employee)
                                      : undefined
                                  }
                                  onDelete={
                                    (canModify || canRequestReview) &&
                                    !isPendingReview(employee)
                                      ? () => handleDelete(employee)
                                      : undefined
                                  }
                                  deleting={deletingId === employee.id}
                                />
                              </td>
                            }
                          >
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            <div className="space-y-1">
                              <span>{employee.name}</span>
                              {isPendingReview(employee) && (
                                <p className="text-xs font-normal text-amber-700 dark:text-amber-300">
                                  En revisión por administrador
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-card-foreground">
                            {employee.nationalId}
                          </td>
                          <td className="max-w-[200px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {companyNameById(
                                companies,
                                resolveEmployeeCompanyId(employee, scope?.branches ?? []) ??
                                  0,
                              )}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[200px] px-5 text-muted">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {employee.phone || employee.email || "—"}
                            </TruncatedText>
                          </td>
                          </TableRowMetaCells>
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
          branches={scope?.branches ?? []}
          companies={companies}
          companiesLoading={scopeLoading}
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
