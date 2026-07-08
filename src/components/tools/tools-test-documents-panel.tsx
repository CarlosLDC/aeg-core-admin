"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
      <section className="rounded-xl border bg-card p-4">
        <h3 className="font-medium">Documentos de prueba</h3>
        <p className="mt-1 text-sm text-muted">
          Genera documentos fiscales de prueba en la impresora física. Las notas
          de crédito y débito requieren serial fiscal registrado.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["invoice", "Factura de prueba"],
              ["credit-note", "NC de prueba"],
              ["debit-note", "ND de prueba"],
              ["generate-z", "Generar Z de prueba"],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              disabled={loading != null}
              onClick={() => void run(action)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
            >
              {loading === action ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {label}
            </button>
          ))}
        </div>
      </section>
    </ToolsPrinterMacGuard>
  );
}
