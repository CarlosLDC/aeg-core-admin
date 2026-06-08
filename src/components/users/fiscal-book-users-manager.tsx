"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { FiscalBookRoleBadge } from "@/components/users/fiscal-book-role-badge";
import {
  FiscalBookUserFormDialog,
  type FiscalBookUserFormValues,
} from "@/components/users/fiscal-book-user-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { filterAllOption } from "@/lib/table-filter-options";
import { fetchEmployees } from "@/lib/employees-api";
import {
  createFiscalBookUser,
  deleteFiscalBookUser,
  fetchFiscalBookUsers,
  getFiscalBookUsersErrorMessage,
  updateFiscalBookUser,
} from "@/lib/fiscal-book-users-api";
import {
  resolveFiscalBookEmployeeId,
  validateFiscalBookUserCreateForm,
  validateFiscalBookUserEditForm,
} from "@/lib/fiscal-book-user-form";
import { FISCAL_BOOK_ROLE_LABELS } from "@/lib/fiscal-book-roles";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { reportListTableError } from "@/lib/api-error-message";
import type { EmployeeResponse } from "@/types/employee";
import {
  FISCAL_BOOK_ROLES,
  type FiscalBookUserResponse,
} from "@/types/fiscal-book-user";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

function displayName(user: FiscalBookUserResponse): string {
  return user.name?.trim() || user.email;
}

export function FiscalBookUsersManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<FiscalBookUserResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<FiscalBookUserResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setListError(null);
    try {
      setUsers(await fetchFiscalBookUsers());
    } catch (err) {
      const message = getFiscalBookUsersErrorMessage(err);
      setListError(message);
      if (!options?.silent) toast.error(message);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadUsers();
    void (async () => {
      setEmployeesLoading(true);
      try {
        setEmployees(await fetchEmployees());
      } catch {
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    })();
  }, [loadUsers]);

  const employeeLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const employee of employees) {
      map.set(employee.id, `${employee.name} (${employee.nationalId})`);
    }
    return map;
  }, [employees]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!q) return true;
      const employeeLabel = user.employeeId
        ? employeeLabelById.get(user.employeeId) ?? ""
        : "";
      return [user.name, user.email, user.role, employeeLabel]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search, roleFilter, employeeLabelById]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(user: FiscalBookUserResponse) {
    setSelected(user);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: FiscalBookUserFormValues) {
    const validationError =
      dialog === "create"
        ? validateFiscalBookUserCreateForm(values)
        : validateFiscalBookUserEditForm(values);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const employeeId = resolveFiscalBookEmployeeId(values.role, values.employeeId);
    if (values.role === "FISCAL_TECHNICIAN" && employeeId == null) {
      setFormError("Selecciona un empleado válido.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (dialog === "create") {
        await createFiscalBookUser({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: values.role,
          employeeId,
        });
        toast.success(`Usuario fiscal "${values.name.trim()}" creado.`);
      } else if (selected) {
        await updateFiscalBookUser(selected.id, {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          role: values.role,
          employeeId,
          enabled: values.enabled,
          ...(values.password.trim() ? { password: values.password } : {}),
        });
        toast.success(`Usuario fiscal "${values.name.trim()}" actualizado.`);
      }
      closeDialog();
      await loadUsers({ silent: true });
    } catch (err) {
      const message = getFiscalBookUsersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: FiscalBookUserResponse) {
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar al usuario fiscal "${displayName(user)}"?`,
        destructive: true,
      }))
    ) {
      return;
    }
    setDeletingId(user.id);
    try {
      await deleteFiscalBookUser(user.id);
      await loadUsers({ silent: true });
      toast.success(`Usuario fiscal "${displayName(user)}" eliminado.`);
    } catch (err) {
      reportListTableError({
        message: getFiscalBookUsersErrorMessage(err),
        recordLabel: displayName(user),
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              pageToolbarButtonClass,
              "bg-accent text-accent-foreground",
            )}
          >
            <Plus className="size-4" />
            Nuevo usuario fiscal
          </button>
        }
      />

      {listError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando usuarios del libro fiscal…
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Aún no hay usuarios del libro fiscal."
            action={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                <Plus className="size-4" />
                Crear primer usuario fiscal
              </button>
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, correo o rol…"
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
                    ...FISCAL_BOOK_ROLES.map((role) => ({
                      value: role,
                      label: FISCAL_BOOK_ROLE_LABELS[role],
                    })),
                  ],
                },
              ]}
            />
            <TableScroll>
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nombre</th>
                    <th className="px-5 py-3 font-medium">Correo</th>
                    <th className="px-5 py-3 font-medium">Rol</th>
                    <th className="px-5 py-3 font-medium">Empleado</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/70">
                      <td className="px-5 py-3 font-medium">{displayName(user)}</td>
                      <td className="px-5 py-3 text-muted">{user.email}</td>
                      <td className="px-5 py-3">
                        <FiscalBookRoleBadge role={user.role} />
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {user.employeeId
                          ? employeeLabelById.get(user.employeeId) ?? `#${user.employeeId}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {user.enabled ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <TableRowActionsMenu
                          viewHref="#"
                          viewLabel={`Usuario fiscal ${displayName(user)}`}
                          onEdit={() => openEdit(user)}
                          onDelete={() => void handleDelete(user)}
                          deleting={deletingId === user.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </>
        )}
      </div>

      <FiscalBookUserFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        user={selected ?? undefined}
        employees={employees}
        employeesLoading={employeesLoading}
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
