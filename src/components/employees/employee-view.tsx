"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { branchLabelById } from "@/lib/branches";
import { formatDate } from "@/lib/datetime-form";
import {
  fetchEmployeeById,
  getEmployeesErrorMessage,
} from "@/lib/employees-api";
import { branchPath } from "@/lib/resource-routes";
import type { EmployeeResponse } from "@/types/employee";

const TYPE_LABELS: Record<EmployeeResponse["type"], string> = {
  administrativo: "Administrativo",
  tecnico: "Técnico",
  vendedor: "Vendedor",
  gerente: "Gerente",
};

export function EmployeeView() {
  const id = useResourceId();
  const { scope } = useCompanyScope();
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de empleado no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEmployeeById(id)
      .then((data) => {
        if (!cancelled) setEmployee(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getEmployeesErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const branches = scope?.branches ?? [];
  const companies = scope?.companies ?? [];
  const branchLabel = employee
    ? branchLabelById(branches, companies, employee.branchId)
    : "";

  return (
    <ResourceViewShell
      backHref="/employees"
      backLabel="Volver a empleados"
      title={employee?.name ?? "Empleado"}
      subtitle={employee?.nationalId}
      loading={loading}
      error={error}
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
  );
}
