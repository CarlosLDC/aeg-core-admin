"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { FiscalMqttTopicGuide } from "@/components/mqtt/fiscal-mqtt-topic-guide";
import { AnnualInspectionMqttModal } from "@/components/mqtt/annual-inspection-mqtt-modal";
import { PrinterSelect } from "@/components/printers/printer-select";
import { useToast } from "@/context/toast-provider";
import {
  applyFailedTestCreditNote,
  applyFailedTestInvoice,
  applyProductDescriptionChange,
  applySuccessfulTestCreditNote,
  applySuccessfulTestInvoice,
  canSendAnnualInspectionTestCreditNote,
  createAnnualInspectionMqttFlowState,
  creditNoteDisabledReason,
  emptyAnnualInspectionChecklist,
  ANNUAL_INSPECTION_DEFAULT_PRODUCT,
  type AnnualInspectionChecklistKey,
  type AnnualInspectionMqttFlowState,
} from "@/lib/annual-inspection-mqtt-state";
import {
  isPrinterEligibleForTestInvoice,
} from "@/lib/enajenacion-mqtt-protocol";
import { fetchClients } from "@/lib/clients-api";
import {
  getMqttErrorMessage,
  requestAnnualInspectionStaInf,
  requestAnnualInspectionTestCreditNote,
  requestAnnualInspectionTestInvoice,
  submitAnnualInspectionMqtt,
} from "@/lib/mqtt-api";
import { fetchPrinters } from "@/lib/printers-api";
import { printerStatusLabel } from "@/lib/printer-status";
import type { AnnualInspectionStaInfResponse } from "@/types/mqtt";
import type { PrinterResponse } from "@/types/printer";
import type { ClientResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";

export function AnnualInspectionMqttPanel() {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<AnnualInspectionMqttFlowState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnnualInspectionStaInfResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTestInvoice, setSendingTestInvoice] = useState(false);
  const [sendingTestCreditNote, setSendingTestCreditNote] = useState(false);
  const [submittingInspection, setSubmittingInspection] = useState(false);

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
        if (!cancelled) setError(getMqttErrorMessage(err));
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

  function resetFlowState() {
    setFlow(null);
    setModalOpen(false);
    setModalError(null);
    setLastResult(null);
  }

  async function refreshRegistration(printerId: number) {
    setRefreshing(true);
    setModalError(null);
    try {
      const result = await requestAnnualInspectionStaInf({ printerId });
      setLastResult(result);
      setFlow((current) =>
        current
          ? {
              ...current,
              registroImpresora: result.registroImpresora,
              fiscalSerial: result.fiscalSerial,
            }
          : createAnnualInspectionMqttFlowState({
              registroImpresora: result.registroImpresora,
              fiscalSerial: result.fiscalSerial,
              printerId,
              productDescription: ANNUAL_INSPECTION_DEFAULT_PRODUCT,
            }),
      );
      toast.success(`Registro actualizado: ${result.registroImpresora}`);
      return result;
    } catch (err) {
      const message = getMqttErrorMessage(err);
      setModalError(message);
      toast.error(message);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStartInspection() {
    if (!activePrinter || typeof selectedId !== "number") {
      setError("Selecciona una impresora enajenada.");
      return;
    }

    setStarting(true);
    setError(null);
    setLastResult(null);
    resetFlowState();

    try {
      const result = await requestAnnualInspectionStaInf({ printerId: selectedId });
      setLastResult(result);
      setFlow(
        createAnnualInspectionMqttFlowState({
          registroImpresora: result.registroImpresora,
          fiscalSerial: result.fiscalSerial,
          printerId: selectedId,
          productDescription: ANNUAL_INSPECTION_DEFAULT_PRODUCT,
        }),
      );
      setModalOpen(true);
      toast.success(`Registro de impresora obtenido: ${result.registroImpresora}`);
    } catch (err) {
      const message = getMqttErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setStarting(false);
    }
  }

  function handleChecklistChange(key: AnnualInspectionChecklistKey, checked: boolean) {
    setFlow((current) =>
      current
        ? {
            ...current,
            checklist: {
              ...current.checklist,
              [key]: checked,
            },
          }
        : current,
    );
  }

  async function handleSendTestInvoice() {
    if (!flow) return;

    setSendingTestInvoice(true);
    setModalError(null);
    try {
      const result = await requestAnnualInspectionTestInvoice({
        printerId: flow.printerId,
        productDescription: flow.productDescription.trim() || undefined,
      });
      setFlow((current) =>
        current ? applySuccessfulTestInvoice(current, result.numeroFacturaPrueba) : current,
      );
      toast.success(`Factura de prueba impresa. Número: ${result.numeroFacturaPrueba}`);
    } catch (err) {
      setFlow((current) => (current ? applyFailedTestInvoice(current) : current));
      const message = getMqttErrorMessage(err);
      setModalError(message);
      toast.error(message);
    } finally {
      setSendingTestInvoice(false);
    }
  }

  async function handleSendTestCreditNote() {
    if (!flow) return;

    setSendingTestCreditNote(true);
    setModalError(null);
    try {
      if (flow.numeroFacturaPrueba == null) {
        throw new Error("Primero envíe la factura de prueba para obtener el número de factura.");
      }
      if (!flow.registroImpresora.trim()) {
        throw new Error("No hay registro de impresora. Use Actualizar o reinicie el flujo.");
      }

      await requestAnnualInspectionTestCreditNote({
        printerId: flow.printerId,
        numeroFacturaPrueba: flow.numeroFacturaPrueba,
        registroImpresora: flow.registroImpresora,
        productDescription: flow.productDescription.trim() || undefined,
      });
      setFlow((current) => (current ? applySuccessfulTestCreditNote(current) : current));
      toast.success("Nota de crédito de prueba generada correctamente.");
    } catch (err) {
      setFlow((current) => (current ? applyFailedTestCreditNote(current) : current));
      const message = getMqttErrorMessage(err);
      setModalError(message);
      toast.error(message);
    } finally {
      setSendingTestCreditNote(false);
    }
  }

  function handleSubmitInspection() {
    if (!flow) return;

    void (async () => {
      setSubmittingInspection(true);
      setModalError(null);
      try {
        await submitAnnualInspectionMqtt({
          printerId: flow.printerId,
          chkPrecinto: flow.checklist.chkPrecinto,
          chkEtiquetaFiscal: flow.checklist.chkEtiquetaFiscal,
          chkFactura: flow.checklist.chkFactura,
          chkNotaCredito: flow.checklist.chkNotaCredito,
          chkSensorPapel: flow.checklist.chkSensorPapel,
        });
        toast.success("Inspección anual registrada en la impresora fiscal.");
        setModalOpen(false);
        setFlow(null);
      } catch (err) {
        const message = getMqttErrorMessage(err);
        setModalError(message);
        toast.error(message);
      } finally {
        setSubmittingInspection(false);
      }
    })();
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
    <>
      <AnnualInspectionMqttModal
        open={modalOpen && flow != null}
        registroImpresora={flow?.registroImpresora ?? ""}
        numeroFacturaPrueba={flow?.numeroFacturaPrueba ?? null}
        productDescription={flow?.productDescription ?? ""}
        onProductDescriptionChange={(value) =>
          setFlow((current) => (current ? applyProductDescriptionChange(current, value) : current))
        }
        checklist={flow?.checklist ?? emptyAnnualInspectionChecklist()}
        onChecklistChange={handleChecklistChange}
        onRefresh={() => {
          if (!flow) return;
          void refreshRegistration(flow.printerId);
        }}
        refreshing={refreshing}
        onSendTestInvoice={() => void handleSendTestInvoice()}
        sendingTestInvoice={sendingTestInvoice}
        onSendTestCreditNote={() => void handleSendTestCreditNote()}
        sendingTestCreditNote={sendingTestCreditNote}
        creditNoteDisabled={flow == null || !canSendAnnualInspectionTestCreditNote(flow)}
        creditNoteDisabledReason={creditNoteDisabledReason(flow)}
        onSubmitInspection={handleSubmitInspection}
        submittingInspection={submittingInspection}
        error={modalError}
        onClose={() => setModalOpen(false)}
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <ClipboardCheck className="size-5 text-accent" />
            Inspección anual obligatoria (MQTT)
          </h2>
          <p className="mt-2 text-sm text-muted">
            Paso 1: consulta el número de registro en la impresora con el comando{" "}
            <code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-xs">StaInf</code>{" "}
            y abre el modal de inspección.
          </p>

          <FiscalMqttTopicGuide
            macAddress={activePrinter?.macAddress}
            className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
          />

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Impresora</span>
            <PrinterSelect
              value={selectedId === "" ? "" : String(selectedId)}
              onChange={(value) => {
                setSelectedId(value ? Number(value) : "");
                setLastResult(null);
                setError(null);
                resetFlowState();
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
            <div className="mt-3">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {printerStatusLabel(activePrinter.status)}
              </span>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleStartInspection()}
            disabled={starting || !activePrinter}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground",
              (starting || !activePrinter) && "cursor-not-allowed opacity-70",
            )}
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : null}
            Inspección Anual Obligatoria
          </button>
        </section>

        {eligiblePrinters.length === 0 ? (
          <p className="text-sm text-muted">
            No hay impresoras enajenadas con serial, MAC y cliente configurados.
          </p>
        ) : null}

        {lastResult ? (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              StaInf completado
            </p>
            <dl className="mt-2 space-y-1 text-card-foreground">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Registro:</dt>
                <dd className="font-mono">{lastResult.registroImpresora}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Respuesta code:</dt>
                <dd>{lastResult.response.code ?? "—"}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </>
  );
}
