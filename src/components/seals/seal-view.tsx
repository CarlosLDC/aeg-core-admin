"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate } from "@/lib/datetime-form";
import { printerPath } from "@/lib/resource-routes";
import { fetchSealById, getSealsErrorMessage } from "@/lib/seals-api";
import { SEAL_COLOR_LABELS, SEAL_STATUS_LABELS } from "@/lib/seal-form";
import type { SealResponse } from "@/types/seal";

export function SealView() {
  const id = useResourceId();
  const [seal, setSeal] = useState<SealResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de precinto no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSealById(id)
      .then((data) => {
        if (!cancelled) setSeal(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getSealsErrorMessage(err));
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
      backHref="/seals"
      backLabel="Volver a precintos"
      title={seal?.serial ?? "Precinto"}
      loading={loading}
      error={error}
    >
      {seal && (
        <DetailCard>
          <DetailField label="ID" value={String(seal.id)} mono />
          <DetailField label="Serial" value={seal.serial} mono />
          <DetailField
            label="Color"
            value={SEAL_COLOR_LABELS[seal.color]}
          />
          <DetailField
            label="Estatus"
            value={SEAL_STATUS_LABELS[seal.status]}
          />
          {seal.printerId != null ? (
            <DetailField
              label="Impresora"
              value={`#${seal.printerId}`}
              href={printerPath(seal.printerId)}
            />
          ) : (
            <DetailField label="Impresora" value="Sin asignar" />
          )}
          <DetailField
            label="Instalación"
            value={formatDate(seal.installationDate)}
          />
          <DetailField
            label="Retiro"
            value={formatDate(seal.removalDate)}
          />
          <DetailField
            label="Registrado"
            value={formatDate(seal.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
