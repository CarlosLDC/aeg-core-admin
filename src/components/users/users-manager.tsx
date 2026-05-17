"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { RoleBadge } from "@/components/users/role-badge";
import {
  UserFormDialog,
  type UserFormValues,
} from "@/components/users/user-form-dialog";
import { branchLabelById } from "@/lib/branches";
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
} from "@/lib/user-form";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { UserResponse } from "@/types/user";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { ROLE_LABELS } from "@/lib/roles";
import { ROLES } from "@/types/user";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";

function parseOptionalId(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const id = Number(value);
  return Number.isFinite(id) ? id : undefined;
}

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

export function UsersManager() {
  const toast = useToast();
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
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter === "active" && !user.enabled) return false;
      if (statusFilter === "inactive" && user.enabled) return false;
      if (!q) return true;
      const branch = branchLabelById(branches, companies, user.branchId);
      const haystack =
        `${user.id} ${user.username} ${user.role} ${branch}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, roleFilter, statusFilter, branches, companies]);

  const pagination = usePagination(filteredUsers);

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
      setListError((prev) => prev ?? message);
      toast.error(message);
    } finally {
      setCatalogLoading(false);
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchUsers();
      setUsers(data.sort((a, b) => a.id - b.id));
    } catch (err) {
      const message = getUsersErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
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
        : validateUserEditForm(values, selected?.role);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const branchId = parseOptionalId(values.branchId);
    const distributorId = parseOptionalId(values.distributorId);
    const username = values.username.trim();

    try {
      if (dialog === "create") {
        await createUser({
          username,
          password: values.password,
          role: values.role,
          ...(branchId !== undefined && { branchId }),
          ...(distributorId !== undefined && { distributorId }),
        });
        toast.success(
          `Usuario "${username}" creado. Ya puede iniciar sesión en el panel.`,
        );
      } else if (selected) {
        const body: Parameters<typeof updateUser>[1] = {
          username,
          role: values.role,
          enabled: values.enabled,
        };
        if (values.password.trim()) {
          body.password = values.password;
        }
        if (branchId !== undefined) {
          body.branchId = branchId;
        }
        if (distributorId !== undefined) {
          body.distributorId = distributorId;
        }
        await updateUser(selected.id, body);
        toast.success(`Usuario "${username}" actualizado.`);
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

  async function handleDelete(user: UserResponse) {
    if (
      !window.confirm(
        `¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      await loadUsers();
      toast.success(`Usuario "${user.username}" eliminado.`);
    } catch (err) {
      const message = getUsersErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  const catalogReady = !catalogLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="min-w-0 text-sm text-muted">
          Crea cuentas con usuario y contraseña. Para distribuidores, indica
          sucursal y distribuidora: al iniciar sesión solo verán los datos de su
          ámbito.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || catalogLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card sm:w-auto px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || catalogLoading) && "animate-spin",
              )}
            />
            Actualizar
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!catalogReady}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 sm:w-auto text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Plus className="size-4" />
            Nuevo usuario
          </button>
        </div>
      </div>

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
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
            <p className="text-sm text-muted">
              Aún no hay usuarios en el sistema.
            </p>
            <button
              type="button"
              onClick={openCreate}
              disabled={!catalogReady}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              <Plus className="size-4" />
              Crear primer usuario
            </button>
          </div>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por usuario, rol o sucursal…"
              resultCount={filteredUsers.length}
              totalCount={users.length}
              filters={[
                {
                  id: "role",
                  label: "Rol",
                  value: roleFilter,
                  onChange: setRoleFilter,
                  options: [
                    { value: "all", label: "Todos" },
                    ...ROLES.map((role) => ({
                      value: role,
                      label: ROLE_LABELS[role],
                    })),
                  ],
                },
                {
                  id: "status",
                  label: "Estado",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activos" },
                    { value: "inactive", label: "Inactivos" },
                  ],
                },
              ]}
            />
            {filteredUsers.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Usuario</th>
                        <th className="px-5 py-3 font-medium">Rol</th>
                        <th className="px-5 py-3 font-medium">Sucursal</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 text-muted">{user.id}</td>
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            {user.username}
                          </td>
                          <td className="px-5 py-3.5">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="max-w-[220px] truncate px-5 py-3.5 text-card-foreground">
                            {branchLabelById(branches, companies, user.branchId)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {user.distributorId != null
                              ? `#${user.distributorId}`
                              : "—"}
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
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(user)}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                aria-label={`Editar ${user.username}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                disabled={deletingId === user.id}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                aria-label={`Eliminar ${user.username}`}
                              >
                                {deletingId === user.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
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
        branchesLoading={catalogLoading}
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
