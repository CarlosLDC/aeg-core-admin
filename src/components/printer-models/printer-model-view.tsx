"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import {
  fetchPrinterModelById,
  getPrinterModelsErrorMessage,
} from "@/lib/printer-models-api";
import type { PrinterModelResponse } from "@/types/printer-model";

export function PrinterModelView() {
  const id = useResourceId();
  const [model, setModel] = useState<PrinterModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de modelo no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPrinterModelById(id)
      .then((data) => {
        if (!cancelled) setModel(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getPrinterModelsErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = model ? `${model.brand} ${model.modelCode}` : "Modelo fiscal";

  return (
    <ResourceViewShell
      backHref="/printer-models"
      backLabel="Volver a modelos"
      title={title}
      subtitle={model?.providencia}
      loading={loading}
      error={error}
    >
      {model && (
        <DetailCard>
          <DetailField label="ID" value={String(model.id)} mono />
          <DetailField label="Marca" value={model.brand} />
          <DetailField label="Modelo" value={model.modelCode} mono />
          <DetailField
            label="Providencia"
            value={model.providencia || "—"}
            fullWidth
          />
          <DetailField
            label="Fecha aprobación"
            value={formatDate(model.approvalDate)}
          />
          <DetailField label="Precio" value={formatMoney(model.price)} />
          <DetailField
            label="Registrado"
            value={formatDate(model.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
