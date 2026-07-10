"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, ChevronDown, Eye, Printer, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionCard,
  ToolsSectionGrid,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
  toolsPanelSectionClass,
  toolsSubsectionClass,
  type ToolsRefreshStatusControl,
} from "@/components/tools/tools-ui";
import { escPosToHtml } from "@/modules/tools/escpos/esc-pos-to-html";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  getToolsMqttErrorMessage,
  reprintToolsDocument,
  sendToolsReportX,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
} from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ReprintAction = "visualize" | "reprint" | "report-x";

type ReprintActionConfig = {
  id: ReprintAction;
  title: string;
  description: string;
  icon: LucideIcon;
  requiresDocumentNumber?: boolean;
};

const REPRINT_ACTIONS: ReprintActionConfig[] = [
  {
    id: "visualize",
    title: "Visualizar documento",
    description: "Muestra una vista previa del documento en pantalla.",
    icon: Eye,
    requiresDocumentNumber: true,
  },
  {
    id: "reprint",
    title: "Reimprimir documento",
    description: "Envía el documento a la impresora para reimpresión.",
    icon: Printer,
    requiresDocumentNumber: true,
  },
  {
    id: "report-x",
    title: "Generar reporte X",
    description: "Genera un reporte X en la impresora.",
    icon: BarChart3,
  },
];

const DOC_TYPE_OPTIONS = [
  { value: "FAC", label: "Factura" },
  { value: "NC", label: "Nota de crédito" },
  { value: "ND", label: "Nota de débito" },
  { value: "NF", label: "No fiscal (NF)" },
  { value: "RX", label: "Reporte X (RX)" },
] as const;

type ToolsReprintSectionProps = {
  printer: ToolsPrinter;
  remoteActionsDisabled?: boolean;
  statusRefresh?: ToolsRefreshStatusControl;
};

export function ToolsReprintSection({
  printer,
  remoteActionsDisabled: remoteActionsDisabledProp,
  statusRefresh: statusRefreshProp,
}: ToolsReprintSectionProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reprint;
  const internalConnection = useToolsPrinterConnection(
    statusRefreshProp ? null : printer.id,
    statusRefreshProp ? null : printer.macAddress,
  );
  const statusRefresh = statusRefreshProp ?? {
    loading: internalConnection.loading,
    refreshStatus: internalConnection.refreshStatus,
    mqttReady: internalConnection.mqttReady,
  };
  const remoteActionsDisabled =
    remoteActionsDisabledProp ?? internalConnection.remoteActionsDisabled;
  const [pendingAction, setPendingAction] = useState<ReprintActionConfig | null>(
    null,
  );
  const [docType, setDocType] = useState("FAC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<ReprintAction | null>(null);

  const closeModal = () => {
    if (loading) return;
    setPendingAction(null);
    setDocType("FAC");
    setDocumentNumber("");
  };

  const openAction = (action: ReprintActionConfig) => {
    setDocType("FAC");
    setDocumentNumber("");
    setPendingAction(action);
  };

  const run = async (action: ReprintAction) => {
    const config = REPRINT_ACTIONS.find((item) => item.id === action);
    const parsedNumber = Number(documentNumber);

    if (
      config?.requiresDocumentNumber &&
      (!Number.isFinite(parsedNumber) || parsedNumber <= 0)
    ) {
      toast.error("Indique un número de documento válido.");
      return;
    }

    setLoading(action);
    try {
      if (action === "report-x") {
        const result = await sendToolsReportX(printer.id);
        toast.success(result.message ?? "Reporte X enviado.");
      } else {
        const result = await reprintToolsDocument(printer.id, {
          docType,
          number: parsedNumber,
          mode: action,
        });
        if (action === "visualize" && result.escPosContent) {
          setPreviewHtml(escPosToHtml(result.escPosContent));
        } else {
          toast.success(result.message ?? "Comando enviado a la impresora.");
        }
      }
      setPendingAction(null);
      setDocType("FAC");
      setDocumentNumber("");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <section className={toolsSubsectionClass}>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
          actions={<ToolsSectionStatusActions statusRefresh={statusRefresh} />}
        />
        <ToolsSectionGrid>
          {REPRINT_ACTIONS.map((action) => (
            <ToolsActionCard
              key={action.id}
              icon={action.icon}
              tone={section.tone}
              title={action.title}
              description={action.description}
              loading={loading === action.id}
              disabled={
                remoteActionsDisabled ||
                (loading != null && loading !== action.id)
              }
              onClick={() => openAction(action)}
            />
          ))}
        </ToolsSectionGrid>
      </section>

      {previewHtml ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={cn(
              toolsPanelSectionClass,
              "max-h-[90vh] w-full max-w-2xl overflow-hidden p-0",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-card-foreground">
                Vista previa del documento
              </h3>
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-muted transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div
              className="max-h-[70vh] overflow-auto p-5 font-mono text-xs"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingAction != null}
        title={pendingAction?.title ?? "Reimpresión"}
        content={
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {pendingAction?.requiresDocumentNumber
                ? "Seleccione el tipo de documento e indique su número."
                : "Confirme para generar el reporte X en la impresora."}
            </p>
            {pendingAction?.requiresDocumentNumber ? (
              <>
                <label className="block">
                  <FieldLabel className="text-muted">Tipo</FieldLabel>
                  <div className="relative">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className={formFieldNativeSelectClass}
                    >
                      {DOC_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                  </div>
                </label>
                <label className="block">
                  <FieldLabel className="text-muted">
                    Número de documento
                  </FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className={formFieldInputClass}
                    autoFocus
                  />
                </label>
              </>
            ) : null}
          </div>
        }
        confirmLabel="Ejecutar"
        loading={loading != null}
        onConfirm={() => {
          if (pendingAction) {
            void run(pendingAction.id);
          }
        }}
        onCancel={closeModal}
      />
    </>
  );
}
