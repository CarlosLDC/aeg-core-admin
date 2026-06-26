"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { RoleBadge } from "@/components/users/role-badge";
import {
  UserFormDialog,
  type UserFormValues,
} from "@/components/users/user-form-dialog";
import { distributorLabel } from "@/lib/branch-roles";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  createUser,
  deleteUser,
  fetchUsers,
  getUsersErrorMessage,
  updateUser,
} from "@/lib/users-api";
import {
  validateUserCreateForm,
  validateUserEditForm,
  resolveUserDistributorId,
  resolveUserBranchId,
  resolveUserNationalId,
} from "@/lib/user-form";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { UserResponse } from "@/types/user";
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
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  reportListTableError,
  toListErrorMessage,
  toToastErrorMessage,
} from "@/lib/api-error-message";
import { usePagination } from "@/hooks/use-pagination";
import { ROLE_LABELS } from "@/lib/roles";
import {
  userCreateSuccessMessage,
  userDistributorDisplayLabel,
  userNationalIdDisplayLabel,
  userPortalAccessLabel,
} from "@/lib/user-access";
import { ROLES } from "@/types/user";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { userPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

function displayUserName(user: UserResponse): string {
  return user.name?.trim() || user.username?.trim() || user.email;
}

type UserSortKey = "id";

function sortBranches(
  branches: BranchResponse[],
  companies: CompanyResponse[],
): BranchResponse[] {
  return [...branches].sort((a, b) => {
    const companyA = companies.find((c) => c.id === a.companyId);
    const companyB = companies.find((c) => c.id === b.companyId);
    const nameCmp = (companyA?.businessName ?? "").localeCompare(
      companyB?.businessName ?? "",
      "es",
    );
    if (nameCmp !== 0) return nameCmp;
    return `${a.city} ${a.state}`.localeCompare(`${b.city} ${b.state}`, "es");
  });
}

function distributorLabelForUser(
  user: UserResponse,
  distributors: DistributorResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  if (user.distributorId == null) return "—";
  const distributor = distributors.find((row) => row.id === user.distributorId);
  if (!distributor) return `Distribuidora #${user.distributorId}`;
  return distributorLabel(distributor, branches, companies);
}

export function UsersManager() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<UserResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableColumns = useTableColumnVisibility("users", {
    includeCreatedAt: false,
  });
  const [sort, setSort] = useState<TableSortState<UserSortKey>>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (portalFilter === "panel" && user.role === "SENIAT") return false;
      if (portalFilter === "book-only" && user.role !== "SENIAT") return false;
      if (statusFilter === "active" && !user.enabled) return false;
      if (statusFilter === "inactive" && user.enabled) return false;
      if (!q) return true;
      const distributor = userDistributorDisplayLabel(
        user.role,
        distributorLabelForUser(user, distributors, branches, companies),
      );
      const cedula = userNationalIdDisplayLabel(user.role, user.nationalId);
      const haystack =
        `${user.id} ${displayUserName(user)} ${user.email} ${user.role} ${userPortalAccessLabel(user.role)} ${distributor} ${cedula}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, roleFilter, portalFilter, statusFilter, branches, companies, distributors]);

  const sortedUsers = useMemo(
    () =>
      sortTableRows(filteredUsers, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
      }),
    [filteredUsers, sort],
  );

  const pagination = usePagination(sortedUsers);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [companyRows, branchRows, distributorRows] = await Promise.all([
        fetchCompanies(),
        fetchBranches(),
        fetchDistributors(),
      ]);
      const sortedCompanies = companyRows.sort((a, b) =>
        (a.businessName || "").localeCompare(b.businessName || "", "es"),
      );
      setCompanies(sortedCompanies);
      setBranches(sortBranches(branchRows, sortedCompanies));
      setDistributors(distributorRows);
    } catch (err) {
      const message = getUsersErrorMessage(err);
      setListError((prev) => prev ?? toListErrorMessage(message));
      toast.error(toToastErrorMessage(message));
    } finally {
      setCatalogLoading(false);
    }
  }, [toast]);

  const loadUsers = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const data = await fetchUsers();
      setUsers(data.sort((a, b) => a.id - b.id));
    } catch (err) {
      reportListTableError({
        message: getUsersErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCatalog(), loadUsers()]);
  }, [loadCatalog, loadUsers]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(user: UserResponse) {
    setSelected(user);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: UserFormValues) {
    const validationError =
      dialog === "create"
        ? validateUserCreateForm(values)
        : validateUserEditForm(values);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const distributorId = resolveUserDistributorId(
      values.role,
      values.distributorId,
    );
    const branchId = resolveUserBranchId(values.role, values.branchId);
    const nationalId = resolveUserNationalId(values.role, values.nationalId);
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    try {
      if (dialog === "create") {
        const created = await createUser({
          name,
          email,
          password: values.password,
          role: values.role,
          distributorId,
          branchId,
          nationalId,
        });
        toast.success(userCreateSuccessMessage(name, values.role), {
          href: userPath(created.id),
        });
      } else if (selected) {
        const body: Parameters<typeof updateUser>[1] = {
          name,
          email,
          role: values.role,
          distributorId,
          branchId,
          nationalId,
          enabled: values.enabled,
        };
        if (values.password.trim()) {
          body.password = values.password;
        }
        await updateUser(selected.id, body);
        toast.success(`Usuario "${name}" actualizado.`, {
          href: userPath(selected.id),
        });
      }
      closeDialog();
      await loadUsers();
    } catch (err) {
      const message = getUsersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserResponse, fromDialog = false) {
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar al usuario "${displayUserName(user)}"? Esta acción no se puede deshacer.`, destructive: true }))) {
      return;
    }
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      if (fromDialog) closeDialog();
      await loadUsers({ silent: true });
      toast.success(`Usuario "${displayUserName(user)}" eliminado.`);
    } catch (err) {
      reportListTableError({
        message: getUsersErrorMessage(err),
        recordLabel: displayUserName(user),
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const catalogReady = !catalogLoading;

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
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
              Nuevo usuario
            </button>
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
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Aún no hay usuarios en el sistema."
            action={
              <button
                type="button"
                onClick={openCreate}
                disabled={!catalogReady}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                <Plus className="size-4" />
                Crear primer usuario
              </button>
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, correo, rol o distribuidora…"
              resultCount={filteredUsers.length}
              totalCount={users.length}
              filters={[
                {
                  id: "role",
                  label: "Rol",
                  value: roleFilter,
                  onChange: setRoleFilter,
                  options: [
                    filterAllOption(),
                    ...ROLES.map((role) => ({
                      value: role,
                      label: ROLE_LABELS[role],
                    })),
                  ],
                },
                {
                  id: "portal",
                  label: "Acceso",
                  value: portalFilter,
                  onChange: setPortalFilter,
                  options: [
                    filterAllOption(),
                    { value: "panel", label: "Panel + libro fiscal" },
                    { value: "book-only", label: "Solo libro fiscal" },
                  ],
                },
                {
                  id: "status",
                  label: "Estado",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    filterAllOption(),
                    { value: "active", label: "Activos" },
                    { value: "inactive", label: "Inactivos" },
                  ],
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredUsers.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={false}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "id"),
                              ),
                          }}
                          actions={
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                          <th className="px-5 py-3 font-medium">Nombre</th>
                          <th className="px-5 py-3 font-medium">Correo</th>
                          <th className="px-5 py-3 font-medium">Rol</th>
                          <th className="px-5 py-3 font-medium">Distribuidora</th>
                          <th className="px-5 py-3 font-medium">Cédula</th>
                          <th className="px-5 py-3 font-medium">Estado</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((user) => (
                        <ClickableTableRow
                          key={user.id}
                          href={userPath(user.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={false}
                            id={user.id}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={userPath(user.id)}
                                  viewLabel={`Ver usuario ${displayUserName(user)}`}
                                  onEdit={() => openEdit(user)}
                                  onDelete={() => void handleDelete(user)}
                                  deleting={deletingId === user.id}
                                />
                              </td>
                            }
                          >
                          <td className="max-w-[200px] px-5 py-3.5">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {displayUserName(user)}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[220px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText maxClassName="max-w-[200px]">
                              {user.email}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {userDistributorDisplayLabel(
                                user.role,
                                distributorLabelForUser(
                                  user,
                                  distributors,
                                  branches,
                                  companies,
                                ),
                              )}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted">
                            {userNationalIdDisplayLabel(
                              user.role,
                              user.nationalId,
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                user.enabled
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
                              )}
                            >
                              {user.enabled ? "Activo" : "Inactivo"}
                            </span>
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

      <UserFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        user={selected ?? undefined}
        branches={branches}
        companies={companies}
        distributors={distributors}
        catalogLoading={catalogLoading}
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
