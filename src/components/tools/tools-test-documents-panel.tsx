"use client";

import { useState } from "react";
import {
  FileMinus,
  FilePlus,
  FileText,
  ScrollText,
} from "lucide-react";
import {
  ToolsActionButton,
  ToolsPage,
  ToolsSectionHeading,
  toolsPanelSectionClass,
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
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { useToast } from "@/context/toast-provider";

type TestAction = "invoice" | "credit-note" | "debit-note" | "generate-z";

const TEST_ACTIONS: Array<{
  action: TestAction;
  label: string;
  icon: typeof FileText;
}> = [
  { action: "invoice", label: "Factura de prueba", icon: FileText },
  { action: "credit-note", label: "NC de prueba", icon: FileMinus },
  { action: "debit-note", label: "ND de prueba", icon: FilePlus },
  {
    action: "generate-z",
    label: "Generar Z de prueba",
    icon: ScrollText,
  },
];

export function ToolsTestDocumentsPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.testDocuments;
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
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
        />

        <div className={toolsPanelSectionClass}>
          <div className="flex flex-wrap gap-2">
            {TEST_ACTIONS.map(({ action, label, icon: Icon }) => (
              <ToolsActionButton
                key={action}
                variant={action === "invoice" ? "primary" : "default"}
                loading={loading === action}
                disabled={loading != null}
                onClick={() => void run(action)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </ToolsActionButton>
            ))}
          </div>
        </div>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
