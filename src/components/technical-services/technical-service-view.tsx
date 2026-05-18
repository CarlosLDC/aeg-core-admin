"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate, formatDateTime, formatMoney } from "@/lib/datetime-form";
import { printerPath, sealPath } from "@/lib/resource-routes";
import {
  fetchTechnicalServiceById,
  getTechnicalServicesErrorMessage,
} from "@/lib/technical-services-api";
import type { TechnicalServiceResponse } from "@/types/technical-service";

export function TechnicalServiceView() {
  const id = useResourceId();
  const [service, setService] = useState<TechnicalServiceResponse | null>(null);
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

    fetchTechnicalServiceById(id)
      .then((data) => {
        if (!cancelled) setService(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getTechnicalServicesErrorMessage(err));
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
      backHref="/technical-services"
      backLabel="Volver a servicios técnicos"
      title={`Servicio técnico #${id ?? ""}`}
      loading={loading}
      error={error}
    >
      {service && (
        <>
          <DetailCard>
            <DetailField label="ID" value={String(service.id)} mono />
            <DetailField
              label="Impresora"
              value={`#${service.printerId}`}
              href={printerPath(service.printerId)}
            />
            <DetailField
              label="Técnico (ID)"
              value={String(service.technicianId)}
              mono
            />
            <DetailField
              label="Falla reportada"
              value={service.reportedFailure}
              fullWidth
            />
            <DetailField
              label="Precinto violado"
              value={service.sealTampered ? "Sí" : "No"}
            />
            <DetailField label="Costo" value={formatMoney(service.cost)} />
            <DetailField
              label="Inicio"
              value={formatDateTime(service.startAt)}
            />
            <DetailField label="Fin" value={formatDateTime(service.endAt)} />
            <DetailField
              label="Solicitud"
              value={formatDate(service.requestDate)}
            />
            {service.installedSealId != null ? (
              <DetailField
                label="Precinto instalado"
                value={`#${service.installedSealId}`}
                href={sealPath(service.installedSealId)}
              />
            ) : null}
            {service.removedSealId != null ? (
              <DetailField
                label="Precinto retirado"
                value={`#${service.removedSealId}`}
                href={sealPath(service.removedSealId)}
              />
            ) : null}
            <DetailField
              label="Notas"
              value={service.notes || "—"}
              fullWidth
            />
          </DetailCard>
          {service.photoUrls.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-medium text-card-foreground">
                Fotos ({service.photoUrls.length})
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {service.photoUrls.map((url, index) => (
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
