"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { PrinterSelect } from "@/components/printers/printer-select";
import { useToast } from "@/context/toast-provider";
import {
  buildInvoiceCommandPayload,
  DEFAULT_TEST_INVOICE_PRODUCT_DESCRIPTION,
  fiscalComandoTopic,
  compactMac,
  formatMqttPayloadForDisplay,
  invoiceProductDescriptionLimitLabel,
  isPrinterEligibleForTestInvoice,
} from "@/lib/enajenacion-mqtt-protocol";
import { fetchClients } from "@/lib/clients-api";
import { getMqttErrorMessage, sendEnajenacionTestInvoice } from "@/lib/mqtt-api";
import { fetchPrinters } from "@/lib/printers-api";
import { printerStatusLabel } from "@/lib/printer-status";
import type { EnajenacionTestInvoiceResponse } from "@/types/mqtt";
import type { PrinterResponse } from "@/types/printer";
import type { ClientResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";

type TestInvoicePanelProps = {
  onOpenActivity?: () => void;
};

export function TestInvoicePanel({ onOpenActivity }: TestInvoicePanelProps) {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [productDescription, setProductDescription] = useState(
    DEFAULT_TEST_INVOICE_PRODUCT_DESCRIPTION,
  );
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<EnajenacionTestInvoiceResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchPrinters(), fetchClients()])
      .then(([printerRows, clientRows]) => {
        if (!cancelled) {
          setPrinters(printerRows);
          setClients(clientRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getMqttErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForTestInvoice),
    [printers],
  );

  const clientNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const client of clients) {
      const name = client.companyBusinessName?.trim();
      if (name) map.set(client.id, name);
    }
    return map;
  }, [clients]);

  const activePrinter = useMemo(
    () =>
      typeof selectedId === "number"
        ? eligiblePrinters.find((printer) => printer.id === selectedId) ?? null
        : null,
    [eligiblePrinters, selectedId],
  );

  const payloadPreview = useMemo(
    () =>
      formatMqttPayloadForDisplay(
        JSON.stringify(buildInvoiceCommandPayload(productDescription)),
      ),
    [productDescription],
  );

  const comandoTopic = useMemo(() => {
    if (!activePrinter?.macAddress) return null;
    return fiscalComandoTopic(compactMac(activePrinter.macAddress));
  }, [activePrinter]);

  const printerOptions = useMemo(
    () =>
      eligiblePrinters.map((printer) => {
        const clientName = printer.clientId
          ? clientNameById.get(printer.clientId) ?? "Cliente"
          : "Sin cliente";
        return {
          id: printer.id,
          label: `${printer.fiscalSerial} · ${clientName}`,
          serial: printer.fiscalSerial,
          searchText: `${printer.id} ${printer.fiscalSerial} ${printer.macAddress} ${clientName}`,
        };
      }),
    [eligiblePrinters, clientNameById],
  );

  async function handleSend() {
    if (!activePrinter || typeof selectedId !== "number") {
      setError("Selecciona una impresora enajenada.");
      return;
    }

    setSending(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await sendEnajenacionTestInvoice({
        printerId: selectedId,
        productDescription: productDescription.trim() || undefined,
      });
      setLastResult(result);
      toast.success(
        `Factura de prueba enviada a ${result.fiscalSerial}. Revisa la pestaña Actividad para la respuesta de la impresora.`,
      );
    } catch (err) {
      const message = getMqttErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Cargando impresoras…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <FileText className="size-5 text-accent" />
          Factura de prueba
        </h2>
        <p className="mt-2 text-sm text-muted">
          Emite la factura fiscal de prueba (8 comandos MQTT) en una impresora ya
          enajenada. El encabezado y pie impresos provienen de la configuración
          guardada en el equipo.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Impresora</span>
          <PrinterSelect
            value={selectedId === "" ? "" : String(selectedId)}
            onChange={(value) => {
              setSelectedId(value ? Number(value) : "");
              setLastResult(null);
              setError(null);
            }}
            options={printerOptions}
            loading={loading}
            emptyLabel="No hay impresoras enajenadas aptas"
            searchPlaceholder="Buscar por serial, MAC o cliente…"
            preloadOptions
            required
          />
        </label>

        {activePrinter ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {printerStatusLabel(activePrinter.status)}
            </span>
            {comandoTopic ? (
              <span className="font-mono text-xs text-muted">{comandoTopic}</span>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">
            Descripción de producto (des01)
          </span>
          <textarea
            value={productDescription}
            onChange={(e) => {
              setProductDescription(e.target.value);
              setLastResult(null);
            }}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder={DEFAULT_TEST_INVOICE_PRODUCT_DESCRIPTION}
          />
          <span className="mt-1 block text-xs text-muted">
            {invoiceProductDescriptionLimitLabel(productDescription)} Se normaliza a
            ISO-8859-2 (Latin-2) antes de publicar por MQTT.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !activePrinter}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground",
              (sending || !activePrinter) && "cursor-not-allowed opacity-70",
            )}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar factura de prueba
          </button>
        </div>
      </section>

      {eligiblePrinters.length === 0 ? (
        <p className="text-sm text-muted">
          No hay impresoras enajenadas con serial, MAC y cliente configurados.
        </p>
      ) : null}

      <details className="rounded-xl border border-border bg-card/40 text-sm shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-card-foreground">
          Vista previa del payload MQTT
        </summary>
        <pre className="max-h-64 overflow-auto border-t border-border px-4 py-3 font-mono text-xs text-card-foreground">
          {payloadPreview}
        </pre>
      </details>

      {lastResult ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            Comando publicado
          </p>
          <dl className="mt-2 space-y-1 text-card-foreground">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Topic:</dt>
              <dd className="font-mono">{lastResult.topic}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Serial:</dt>
              <dd className="font-mono">{lastResult.fiscalSerial}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Publicado:</dt>
              <dd>{new Date(lastResult.publishedAt).toLocaleString("es-VE")}</dd>
            </div>
          </dl>
          {onOpenActivity ? (
            <button
              type="button"
              onClick={onOpenActivity}
              className="mt-3 text-sm font-medium text-accent hover:underline"
            >
              Ver actividad MQTT
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
