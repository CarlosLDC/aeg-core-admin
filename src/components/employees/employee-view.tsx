"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoleBadge } from "@/components/employees/employee-role-badge";
import {
  EmployeeFormDialog,
} from "@/components/employees/employee-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteEmployeeRecord,
  canUpdateEmployeeRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertEmployeeInScope } from "@/lib/permissions/scope-access";
import { branchLabelById } from "@/lib/branches";
import { fetchDistributorPersons } from "@/lib/distributor-persons-api";
import {
  toEmployeePayload,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  deleteEmployeeRoles,
  getEmployeeRolesErrorMessage,
  mergeEmployeesWithRoles,
  syncEmployeeRoles,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  deleteEmployee,
  fetchEmployeeById,
  getEmployeesErrorMessage,
  updateEmployee,
} from "@/lib/employees-api";
import { fetchTechnicians } from "@/lib/technicians-api";
import { formatDate } from "@/lib/datetime-form";
import { branchPath, employeePath } from "@/lib/resource-routes";
import type { Role } from "@/types/user";

const TYPE_LABELS: Record<EmployeeWithRoles["type"], string> = {
  administrativo: "Administrativo",
  tecnico: "Técnico",
  vendedor: "Vendedor",
  gerente: "Gerente",
};

export function EmployeeView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const canModify = user ? canUpdateEmployeeRecord(user.role) : false;
  const canDelete = user ? canDeleteEmployeeRecord(user.role) : false;
  const userRole = (user?.role ?? "ADMIN") as Role;

  const [employee, setEmployee] = useState<EmployeeWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const branches = scope?.branches ?? [];
  const companies = scope?.companies ?? [];

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de empleado no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [row, technicians, distributorPersons] = await Promise.all([
        fetchEmployeeById(id),
        fetchTechnicians(),
        fetchDistributorPersons(),
      ]);
      const merged = mergeEmployeesWithRoles(
        [row],
        technicians.filter((t) => t.employeeId === id),
        distributorPersons.filter((d) => d.employeeId === id),
      );
      const record = merged[0] ?? null;
      if (user && record && !assertEmployeeInScope(scope, record, user.role)) {
        setError("No tienes acceso a este recurso.");
        setEmployee(null);
        return;
      }
      setEmployee(record);
    } catch (err) {
      setError(getEmployeesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, scope, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: EmployeeFormValues) {
    if (!employee || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const payload = toEmployeePayload(values);
    if (typeof payload === "string") {
      setFormError(payload);
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = payload.request.name;

    try {
      await updateEmployee(employee.id, payload.request);
      await syncEmployeeRoles(employee.id, employee, payload.tableRoles);
      await load();
      toast.success(`Empleado "${label}" actualizado.`, {
        href: employeePath(employee.id),
      });
      setEditOpen(false);
      await refresh();
    } catch (err) {
      const message =
        getEmployeesErrorMessage(err) || getEmployeeRolesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee || !canDelete) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = employee.name;
    if (
      !window.confirm(
        `¿Eliminar al empleado "${label}"? Puede afectar técnicos o inspecciones vinculadas.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteEmployeeRoles(employee);
      await deleteEmployee(employee.id);
      await refresh();
      toast.success(`Empleado "${label}" eliminado.`);
      router.push("/employees");
    } catch (err) {
      const message =
        getEmployeesErrorMessage(err) || getEmployeeRolesErrorMessage(err);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const branchLabel = employee
    ? branchLabelById(branches, companies, employee.branchId)
    : "";

  return (
    <>
      <ResourceViewShell
        backHref="/employees"
        backLabel="Volver a empleados"
        title={employee?.name ?? "Empleado"}
        subtitle={employee?.nationalId}
        loading={loading}
        error={error}
        actions={
          employee ? (
            <ResourceViewActions
              onEdit={
                canModify
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={canDelete ? () => void handleDelete() : undefined}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {employee && (
          <DetailCard>
            <DetailField label="ID" value={String(employee.id)} mono />
            <DetailField label="Nombre" value={employee.name} fullWidth />
            <DetailField label="Cédula" value={employee.nationalId} mono />
            <DetailField
              label="Tipo"
              value={TYPE_LABELS[employee.type] ?? employee.type}
            />
            <DetailField
              label="Rol"
              value={<EmployeeRoleBadge employee={employee} />}
            />
            <DetailField
              label="Sucursal"
              value={branchLabel}
              href={branchPath(employee.branchId)}
              fullWidth
            />
            <DetailField label="Teléfono" value={employee.phone || "—"} />
            <DetailField label="Correo" value={employee.email || "—"} />
            <DetailField
              label="Registrado"
              value={formatDate(employee.createdAt)}
            />
          </DetailCard>
        )}
      </ResourceViewShell>

      {employee && editOpen && user && (
        <EmployeeFormDialog
          mode="edit"
          employee={employee}
          userRole={userRole}
          branches={branches}
          companies={companies}
          branchesLoading={false}
          open={editOpen}
          saving={saving}
          deleting={deleting}
          error={formError}
          onClose={() => {
            if (!saving && !deleting) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
          onDelete={() => void handleDelete()}
        />
      )}
    </>
  );
}
