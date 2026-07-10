"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Eye, Printer } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { ToolsDocumentPdfModal } from "@/components/tools/tools-document-pdf-modal";
import {
  ToolsActionCard,
  ToolsSectionGrid,
  ToolsSectionHeading,
  toolsPanelSectionClass,
  toolsSubsectionClass,
} from "@/components/tools/tools-ui";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  getToolsMqttErrorMessage,
  getToolsReprintErrorMessage,
  reprintToolsDocument,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
} from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

type ReprintAction = "visualize" | "reprint";

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
];

const DOC_TYPE_OPTIONS = [
  { value: "FAC", label: "Factura" },
  { value: "NC", label: "Nota de crédito" },
  { value: "ND", label: "Nota de débito" },
  { value: "NF", label: "No fiscal (NF)" },
  { value: "Z", label: "Reporte Z" },
] as const;

type DocumentPreviewState = {
  rawContent: string;
  docType: string;
  documentNumber: number;
};

type ToolsReprintSectionProps = {
  printer: ToolsPrinter;
  remoteActionsDisabled?: boolean;
};

export function ToolsReprintSection({
  printer,
  remoteActionsDisabled: remoteActionsDisabledProp,
}: ToolsReprintSectionProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reprint;
  const internalConnection = useToolsPrinterConnection(
    remoteActionsDisabledProp !== undefined ? null : printer.id,
    remoteActionsDisabledProp !== undefined ? null : printer.macAddress,
  );
  const remoteActionsDisabled =
    remoteActionsDisabledProp ?? internalConnection.remoteActionsDisabled;
  const [pendingAction, setPendingAction] = useState<ReprintActionConfig | null>(
    null,
  );
  const [docType, setDocType] = useState("FAC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentPreview, setDocumentPreview] =
    useState<DocumentPreviewState | null>(null);
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
      const result = await reprintToolsDocument(printer.id, {
        docType,
        number: parsedNumber,
        mode: action,
      });
      if (action === "visualize" && result.escPosContent) {
        setDocumentPreview({
          rawContent: result.escPosContent,
          docType,
          documentNumber: parsedNumber,
        });
      } else {
        toast.success(result.message ?? "Comando enviado a la impresora.");
      }
      setPendingAction(null);
      setDocType("FAC");
      setDocumentNumber("");
    } catch (err) {
      toast.error(
        getToolsReprintErrorMessage(err, {
          docType,
          number: parsedNumber,
        }),
      );
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

      {documentPreview ? (
        <ToolsDocumentPdfModal
          open
          rawContent={documentPreview.rawContent}
          documentType={documentPreview.docType}
          documentNumber={documentPreview.documentNumber}
          printerSerial={printer.serial}
          onClose={() => setDocumentPreview(null)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingAction != null}
        title={pendingAction?.title ?? "Reimpresión"}
        content={
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Seleccione el tipo de documento e indique su número.
            </p>
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
