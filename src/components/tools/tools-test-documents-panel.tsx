"use client";

import { useState } from "react";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  sendToolsTestCreditNote,
  sendToolsTestDebitNote,
  sendToolsTestGenerateZ,
  sendToolsTestInvoice,
} from "@/lib/tools-mqtt-api";
import { useToast } from "@/context/toast-provider";

type TestAction = "invoice" | "credit-note" | "debit-note" | "generate-z";

const TEST_ACTIONS = [
  ["invoice", "Factura de prueba"],
  ["credit-note", "NC de prueba"],
  ["debit-note", "ND de prueba"],
  ["generate-z", "Generar Z de prueba"],
] as const;

export function ToolsTestDocumentsPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const [loading, setLoading] = useState<TestAction | null>(null);

  const run = async (action: TestAction) => {
    if (action === "credit-note" || action === "debit-note") {
      if (!printer.serial?.trim()) {
        toast.error("La impresora no tiene serial fiscal registrado.");
        return;
      }
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
        case "generate-z":
          result = await sendToolsTestGenerateZ(printer.id);
          break;
      }

      if (result.success) {
        toast.success(result.message ?? "Comando enviado a la impresora.");
      } else {
        toast.error(result.message ?? "No se pudo completar la operación.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPanelSection
        title="Documentos de prueba"
        description="Genera documentos fiscales de prueba en la impresora física. Las notas de crédito y débito requieren serial fiscal registrado."
      >
        <ToolsPanelActions>
          {TEST_ACTIONS.map(([action, label]) => (
            <ToolsActionButton
              key={action}
              loading={loading === action}
              disabled={loading != null}
              variant={action === "invoice" ? "primary" : "default"}
              onClick={() => void run(action)}
            >
              {label}
            </ToolsActionButton>
          ))}
        </ToolsPanelActions>
      </ToolsPanelSection>
    </ToolsPrinterMacGuard>
  );
}
