"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FileMinus,
  FilePlus,
  FileText,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ToolsActionCard,
  ToolsSectionGrid,
  ToolsSectionHeading,
  toolsSubsectionClass,
} from "@/components/tools/tools-ui";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  getToolsMqttErrorMessage,
  sendToolsTestCreditNote,
  sendToolsTestDebitNote,
  sendToolsTestInvoice,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { useToast } from "@/context/toast-provider";

type TestAction = "invoice" | "credit-note" | "debit-note";

type TestDocumentActionConfig = {
  id: TestAction;
  title: string;
  description: string;
  icon: LucideIcon;
  requiresFiscalSerial?: boolean;
};

const TEST_DOCUMENT_ACTIONS: TestDocumentActionConfig[] = [
  {
    id: "invoice",
    title: "Factura de prueba",
    description: "Genera una factura fiscal de prueba en la impresora.",
    icon: FileText,
  },
  {
    id: "credit-note",
    title: "NC de prueba",
    description: "Genera una nota de crédito de prueba en la impresora.",
    icon: FileMinus,
    requiresFiscalSerial: true,
  },
  {
    id: "debit-note",
    title: "ND de prueba",
    description: "Genera una nota de débito de prueba en la impresora.",
    icon: FilePlus,
    requiresFiscalSerial: true,
  },
];

type ToolsTestDocumentsSectionProps = {
  printer: ToolsPrinter;
  remoteActionsDisabled?: boolean;
};

export function ToolsTestDocumentsSection({
  printer,
  remoteActionsDisabled: remoteActionsDisabledProp,
}: ToolsTestDocumentsSectionProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.testDocuments;
  const internalConnection = useToolsPrinterConnection(
    remoteActionsDisabledProp !== undefined ? null : printer.id,
    remoteActionsDisabledProp !== undefined ? null : printer.macAddress,
  );
  const remoteActionsDisabled =
    remoteActionsDisabledProp ?? internalConnection.remoteActionsDisabled;
  const [pendingAction, setPendingAction] =
    useState<TestDocumentActionConfig | null>(null);
  const [loading, setLoading] = useState<TestAction | null>(null);

  const closeModal = () => {
    if (loading) return;
    setPendingAction(null);
  };

  const openAction = (action: TestDocumentActionConfig) => {
    setPendingAction(action);
  };

  const run = async (action: TestAction) => {
    if (
      (action === "credit-note" || action === "debit-note") &&
      !printer.serial?.trim()
    ) {
      toast.error("La impresora no tiene serial fiscal registrado.");
      return;
    }

    setLoading(action);
    try {
      let result;
      switch (action) {
        case "invoice":
          result = await sendToolsTestInvoice(printer.id);
          break;
        case "credit-note":
          result = await sendToolsTestCreditNote(printer.id);
          break;
        case "debit-note":
          result = await sendToolsTestDebitNote(printer.id);
          break;
      }

      if (result.success) {
        toast.success(result.message ?? "Comando enviado a la impresora.");
      } else {
        toast.error(result.message ?? "No se pudo completar la operación.");
      }
      setPendingAction(null);
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
        />
        <ToolsSectionGrid>
          {TEST_DOCUMENT_ACTIONS.map((action) => (
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

      <ConfirmDialog
        open={pendingAction != null}
        title={pendingAction?.title ?? "Documento de prueba"}
        message={
          pendingAction?.requiresFiscalSerial
            ? `${pendingAction.description} Requiere serial fiscal registrado.`
            : pendingAction?.description
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
