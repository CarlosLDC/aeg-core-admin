"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate } from "@/lib/datetime-form";
import { employeePath, printerPath } from "@/lib/resource-routes";
import {
  fetchAnnualInspectionById,
  getAnnualInspectionsErrorMessage,
} from "@/lib/annual-inspections-api";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";

export function AnnualInspectionView() {
  const id = useResourceId();
  const [inspection, setInspection] = useState<AnnualInspectionResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAnnualInspectionById(id)
      .then((data) => {
        if (!cancelled) setInspection(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getAnnualInspectionsErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <ResourceViewShell
      backHref="/annual-inspections"
      backLabel="Volver a inspecciones"
      title={`Inspección anual #${id ?? ""}`}
      loading={loading}
      error={error}
    >
      {inspection && (
        <>
          <DetailCard>
            <DetailField label="ID" value={String(inspection.id)} mono />
            <DetailField
              label="Impresora"
              value={`#${inspection.printerId}`}
              href={printerPath(inspection.printerId)}
            />
            <DetailField
              label="Empleado"
              value={`#${inspection.employeeId}`}
              href={employeePath(inspection.employeeId)}
            />
            <DetailField
              label="Fecha inspección"
              value={formatDate(inspection.inspectionDate)}
            />
            <DetailField
              label="Precinto violado"
              value={inspection.sealTampered ? "Sí" : "No"}
            />
            <DetailField
              label="Notas"
              value={inspection.notes || "—"}
              fullWidth
            />
            <DetailField
              label="Registrada"
              value={formatDate(inspection.createdAt)}
            />
          </DetailCard>
          {inspection.photoUrls.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-medium text-card-foreground">
                Fotos ({inspection.photoUrls.length})
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {inspection.photoUrls.map((url, index) => (
                  <li key={url}>
                    <a
                      href={`/api/uploads/documents?url=${encodeURIComponent(url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      Foto {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </ResourceViewShell>
  );
}
