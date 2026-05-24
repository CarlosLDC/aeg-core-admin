"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeRoleBadge } from "@/components/employees/employee-role-badge";
import {
  EmployeeFormDialog,
} from "@/components/employees/employee-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useDistributorId } from "@/hooks/use-distributor-id";
import { useDistributorStaffBranches } from "@/hooks/use-distributor-staff-branches";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteEmployeeRecord,
  canUpdateEmployeeRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertEmployeeInScope } from "@/lib/permissions/scope-access";
import { branchLabelById } from "@/lib/branches";
import {
  toEmployeePayload,
  toModificationProposedData,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  deleteEmployeeRoles,
  getEmployeeRolesErrorMessage,
  loadEmployeeWithRoles,
  syncEmployeeRoles,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  deleteEmployee,
  getEmployeesErrorMessage,
  requestEmployeeDelete,
  requestEmployeeUpdate,
  updateEmployee,
} from "@/lib/employees-api";
import { formatDate } from "@/lib/datetime-form";
import { branchPath, employeePath } from "@/lib/resource-routes";
import type { Role } from "@/types/user";

export function EmployeeView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const canModify = user ? canUpdateEmployeeRecord(user.role) : false;
  const canDelete = user ? canDeleteEmployeeRecord(user.role) : false;
  const canRequestReview = user?.role === "DISTRIBUTOR";
  const userRole = (user?.role ?? "ADMIN") as Role;
  const isDistributor = user?.role === "DISTRIBUTOR";
  const distributorId = useDistributorId();
  const {
    staffBranches,
    staffBranchIdSet,
    loading: staffBranchesLoading,
  } = useDistributorStaffBranches(isDistributor ? distributorId : null);

  const [employee, setEmployee] = useState<EmployeeWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clientBranches = scope?.branches ?? [];
  const companies = scope?.companies ?? [];
  const formBranches = isDistributor ? staffBranches : clientBranches;
  const defaultStaffBranchId =
    staffBranches.length === 1 ? String(staffBranches[0].id) : "";

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de empleado no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const record = await loadEmployeeWithRoles(
        id,
        user?.role ?? "ADMIN",
      );
      if (
        user &&
        record &&
        !assertEmployeeInScope(
          scope,
          record,
          user.role,
          isDistributor ? staffBranchIdSet : undefined,
        )
      ) {
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
  }, [id, scope, user, isDistributor, staffBranchIdSet]);

  useEffect(() => {
    if (isDistributor && staffBranchesLoading) return;
    void load();
  }, [load, isDistributor, staffBranchesLoading]);

  async function handleSubmit(values: EmployeeFormValues) {
    if (!employee) {
      setFormError("Empleado no encontrado.");
      return;
    }
    if (employee.reviewStatus === "PENDING_REVIEW") {
      setFormError("Este empleado tiene una solicitud pendiente de aprobación.");
      return;
    }
    if (!canModify && !canRequestReview) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const payload = toEmployeePayload(values);
    if (typeof payload === "string") {
      setFormError(payload);
      return;
    }

    if (
      isDistributor &&
      !staffBranchIdSet.has(payload.request.branchId)
    ) {
      setFormError(
        "Solo puedes registrar empleados en la sucursal de tu distribuidora.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = payload.request.name;

    try {
      if (canRequestReview) {
        await requestEmployeeUpdate(
          employee.id,
          toModificationProposedData(payload.request, payload.tableRoles),
        );
      } else {
        await updateEmployee(employee.id, payload.request);
        await syncEmployeeRoles(employee.id, employee, payload.tableRoles);
      }
      await load();
      toast.success(
        canRequestReview
          ? `Solicitud de actualización para "${label}" enviada a revisión.`
          : `Empleado "${label}" actualizado.`,
        {
        href: employeePath(employee.id),
      },
      );
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
    if (!employee) {
      toast.error("Empleado no encontrado.");
      return;
    }
    if (employee.reviewStatus === "PENDING_REVIEW") {
      toast.error("Este empleado ya tiene una solicitud pendiente de aprobación.");
      return;
    }
    if (!canDelete && !canRequestReview) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = employee.name;
    const message = canRequestReview
      ? `¿Solicitar eliminación para "${label}"? Un administrador debe aprobar la solicitud.`
      : `¿Eliminar al empleado "${label}"? Puede afectar técnicos o inspecciones vinculadas.`;
    if (!(await confirm({ title: "Confirmar", message, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      if (canRequestReview) {
        await requestEmployeeDelete(employee.id);
      } else {
        await deleteEmployeeRoles(employee);
        await deleteEmployee(employee.id);
      }
      await refresh();
      toast.success(
        canRequestReview
          ? `Solicitud de eliminación para "${label}" enviada a revisión.`
          : `Empleado "${label}" eliminado.`,
      );
      if (!canRequestReview) {
        router.push("/employees");
      } else {
        await load();
      }
    } catch (err) {
      const message =
        getEmployeesErrorMessage(err) || getEmployeeRolesErrorMessage(err);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const branchLabel = employee
    ? branchLabelById(formBranches, companies, employee.branchId)
    : "—";
  const pendingReview = employee?.reviewStatus === "PENDING_REVIEW";
  const isAdmin = user?.role === "ADMIN";
  const reviewHref =
    employee?.activeModificationRequestId != null
      ? `/employees/reviews/${employee.activeModificationRequestId}`
      : "/employees/reviews";

  return (
    <>
      <ResourceViewShell
        backHref="/employees"
        backLabel="Volver a empleados"
        title={employee?.name ?? "Empleado"}
        loading={loading}
        error={error}
        actions={
          employee ? (
            <ResourceViewActions
              onEdit={
                (canModify || canRequestReview) && !pendingReview
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={
                (canDelete || canRequestReview) && !pendingReview
                  ? () => void handleDelete()
                  : undefined
              }
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {employee && (
          <div className="space-y-4">
            {pendingReview && (
              <p
                role="status"
                className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
              >
                <span>
                  {isAdmin
                    ? "En revisión: ediciones bloqueadas."
                    : "En revisión: espera la decisión del administrador."}
                </span>
                {isAdmin && (
                  <Link
                    href={reviewHref}
                    className="shrink-0 font-medium text-accent hover:underline"
                  >
                    Ver solicitud
                  </Link>
                )}
              </p>
            )}
            <DetailSection title="Empleado" layout="quad">
              <DetailField label="ID" value={String(employee.id)} mono />
              <DetailField label="Nombre" value={employee.name} />
              <DetailField label="Cédula" value={employee.nationalId} mono />
              <DetailField
                label="Rol"
                value={<EmployeeRoleBadge employee={employee} />}
              />
              <DetailField label="Teléfono" value={employee.phone || "—"} />
              <DetailField label="Correo" value={employee.email || "—"} />
              <DetailField
                label="Registrado"
                value={formatDate(employee.createdAt)}
              />
              <DetailField
                label="Sucursal"
                value={branchLabel}
                href={branchPath(employee.branchId)}
              />
              <DetailField
                label="ID sucursal"
                value={String(employee.branchId)}
                mono
              />
            </DetailSection>
          </div>
        )}
      </ResourceViewShell>

      {employee && editOpen && user && (
        <EmployeeFormDialog
          mode="edit"
          employee={employee}
          userRole={userRole}
          branches={formBranches}
          companies={companies}
          branchesLoading={isDistributor && staffBranchesLoading}
          defaultBranchId={defaultStaffBranchId}
          lockBranch={isDistributor && staffBranches.length === 1}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
