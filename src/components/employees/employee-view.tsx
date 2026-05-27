"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteEmployeeRecord,
  canUpdateEmployeeRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertEmployeeInScope } from "@/lib/permissions/scope-access";
import { companyNameById } from "@/lib/branches";
import { resolveEmployeeCompanyId } from "@/lib/employee-company";
import {
  toEmployeePayload,
  toModificationProposedData,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  loadEmployeeWithRoles,
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
import {
  employeeModificationReviewPath,
  employeeModificationReviewsListPath,
  employeePath,
} from "@/lib/resource-routes";

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

  const [employee, setEmployee] = useState<EmployeeWithRoles | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
  }, [id, scope, user]);

  useEffect(() => {
    void load();
  }, [load]);

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

    if (scope && !scope.companyIds.has(payload.request.companyId)) {
      setFormError("La empresa seleccionada no está dentro de tu alcance.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = payload.request.name;

    try {
      if (canRequestReview) {
        await requestEmployeeUpdate(
          employee.id,
          toModificationProposedData(payload.request),
        );
      } else {
        await updateEmployee(employee.id, payload.request);
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
      const message = getEmployeesErrorMessage(err);
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
      toast.error(getEmployeesErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const companyLabel = employee
    ? companyNameById(
        companies,
        resolveEmployeeCompanyId(employee, scope?.branches ?? []) ?? 0,
      )
    : "—";
  const pendingReview = employee?.reviewStatus === "PENDING_REVIEW";
  const isAdmin = user?.role === "ADMIN";
  const reviewHref =
    employee?.activeModificationRequestId != null
      ? employeeModificationReviewPath(employee.activeModificationRequestId)
      : employeeModificationReviewsListPath;

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
              <DetailField label="Teléfono" value={employee.phone || "—"} />
              <DetailField label="Correo" value={employee.email || "—"} />
              <DetailField
                label="Registrado"
                value={formatDate(employee.createdAt)}
              />
              <DetailField
                label="Empresa"
                value={companyLabel}
              />
              <DetailField
                label="ID empresa"
                value={String(resolveEmployeeCompanyId(employee, scope?.branches ?? []) ?? "—")}
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
          branches={scope?.branches ?? []}
          companies={companies}
          companiesLoading={false}
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
