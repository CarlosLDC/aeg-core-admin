"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import {
  DEVICE_TYPE_LABELS,
  PRINTER_STATUS_LABELS,
} from "@/lib/printer-form";
import {
  fetchPrinterById,
  getPrintersErrorMessage,
} from "@/lib/printers-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { printerModelPath } from "@/lib/resource-routes";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterModelResponse } from "@/types/printer-model";

export function PrinterView() {
  const id = useResourceId();
  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de impresora no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchPrinterById(id), fetchPrinterModels()])
      .then(([data, modelRows]) => {
        if (!cancelled) {
          setPrinter(data);
          setModels(modelRows);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getPrintersErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const model = printer
    ? models.find((m) => m.id === printer.modelId)
    : undefined;
  const modelLabel = model
    ? `${model.brand} ${model.modelCode}`
    : printer
      ? `Modelo #${printer.modelId}`
      : "";

  return (
    <ResourceViewShell
      backHref="/printers"
      backLabel="Volver a impresoras"
      title={printer?.fiscalSerial ?? "Impresora"}
      subtitle={modelLabel}
      loading={loading}
      error={error}
    >
      {printer && (
        <DetailCard>
          <DetailField label="ID" value={String(printer.id)} mono />
          <DetailField
            label="Serial fiscal"
            value={printer.fiscalSerial}
            mono
          />
          <DetailField
            label="Modelo"
            value={modelLabel}
            href={model ? printerModelPath(model.id) : undefined}
            fullWidth
          />
          <DetailField
            label="Estatus"
            value={PRINTER_STATUS_LABELS[printer.status]}
          />
          <DetailField
            label="Tipo de equipo"
            value={DEVICE_TYPE_LABELS[printer.deviceType]}
          />
          <DetailField
            label="Pagada"
            value={printer.paid ? "Sí" : "No"}
          />
          <DetailField
            label="Precio venta"
            value={formatMoney(printer.finalSalePrice)}
          />
          <DetailField
            label="Instalación"
            value={formatDate(printer.installationDate)}
          />
          <DetailField
            label="Firmware"
            value={printer.versionFirmware || "—"}
          />
          <DetailField
            label="MAC"
            value={printer.macAddress || "—"}
            mono
          />
          <DetailField
            label="Registrada"
            value={formatDate(printer.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
