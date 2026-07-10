"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FileSearch,
  Printer,
  ScrollText,
  Send,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionCard,
  ToolsPanelSection,
  ToolsSectionGrid,
  ToolsSectionHeading,
  toolsSubsectionClass,
} from "@/components/tools/tools-ui";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  generateToolsReportZ,
  getToolsMqttErrorMessage,
  getToolsReportZ,
  listToolsReportZ,
  reprintToolsDocument,
  transmitToolsReportZ,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

type ReportAction = "list" | "generate" | "get" | "transmit" | "reprint";

type ReportZActionConfig = {
  id: ReportAction;
  title: string;
  description: string;
  icon: LucideIcon;
  requiresReportNumber?: boolean;
};

const REPORT_Z_ACTIONS: ReportZActionConfig[] = [
  {
    id: "list",
    title: "Consultar último Z",
    description: "Obtiene el último reporte Z registrado en la impresora.",
    icon: FileSearch,
  },
  {
    id: "generate",
    title: "Generar Z",
    description: "Genera un nuevo reporte Z en la impresora.",
    icon: ScrollText,
  },
  {
    id: "get",
    title: "Obtener Z específico",
    description: "Consulta un reporte Z por su número.",
    icon: FileSearch,
    requiresReportNumber: true,
  },
  {
    id: "transmit",
    title: "Transmitir a SENIAT",
    description: "Envía el último reporte Z al SENIAT.",
    icon: Send,
  },
  {
    id: "reprint",
    title: "Reimprimir Z",
    description: "Reimprime un reporte Z en la impresora.",
    icon: Printer,
    requiresReportNumber: true,
  },
];

type ToolsReporteZSectionProps = {
  printer: ToolsPrinter;
};

export function ToolsReporteZSection({ printer }: ToolsReporteZSectionProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reporteZ;
  const [pendingAction, setPendingAction] = useState<ReportZActionConfig | null>(
    null,
  );
  const [reportNumber, setReportNumber] = useState("");
  const [reportJson, setReportJson] = useState<string | null>(null);
  const [loading, setLoading] = useState<ReportAction | null>(null);

  const showReport = (report: Record<string, unknown> | undefined) => {
    if (report) {
      setReportJson(JSON.stringify(report, null, 2));
    }
  };

  const closeModal = () => {
    if (loading) return;
    setPendingAction(null);
    setReportNumber("");
  };

  const openAction = (action: ReportZActionConfig) => {
    setReportNumber("");
    setPendingAction(action);
  };

  const run = async (action: ReportAction, numberInput: string) => {
    const config = REPORT_Z_ACTIONS.find((item) => item.id === action);
    const parsedNumber = Number(numberInput);

    if (
      config?.requiresReportNumber &&
      (!Number.isFinite(parsedNumber) || parsedNumber <= 0)
    ) {
      toast.error("Indique un número de reporte Z válido.");
      return;
    }

    setLoading(action);
    try {
      if (action === "list") {
        const result = await listToolsReportZ(printer.id);
        showReport(result.report?.report);
        toast.success("Último reporte Z consultado.");
      } else if (action === "generate") {
        const result = await generateToolsReportZ(printer.id);
        showReport(result.report?.report);
        toast.success("Reporte Z generado.");
      } else if (action === "get") {
        const result = await getToolsReportZ(printer.id, parsedNumber);
        showReport(result.report?.report);
        toast.success(`Reporte Z #${parsedNumber} obtenido.`);
      } else if (action === "transmit") {
        const result = await transmitToolsReportZ(printer.id);
        if (result.seniatUnavailable) {
          toast.error(result.message ?? "SENIAT no responde.");
        } else if (result.lastTransmittedZ != null) {
          toast.success(`Último Z transmitido: ${result.lastTransmittedZ}`);
        } else {
          toast.success(result.message ?? "Transmisión completada.");
        }
      } else {
        await reprintToolsDocument(printer.id, {
          docType: "Z",
          number: parsedNumber,
          mode: "reprint",
        });
        toast.success(`Reimpresión Z #${parsedNumber} enviada a la impresora.`);
      }
      setPendingAction(null);
      setReportNumber("");
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
          {REPORT_Z_ACTIONS.map((action) => (
            <ToolsActionCard
              key={action.id}
              icon={action.icon}
              tone={section.tone}
              title={action.title}
              description={action.description}
              loading={loading === action.id}
              disabled={loading != null && loading !== action.id}
              onClick={() => openAction(action)}
            />
          ))}
        </ToolsSectionGrid>
      </section>

      {reportJson ? (
        <ToolsPanelSection
          title="Datos del reporte"
          icon={ScrollText}
          tone={section.tone}
        >
          <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-3 text-xs">
            {reportJson}
          </pre>
        </ToolsPanelSection>
      ) : null}

      <ConfirmDialog
        open={pendingAction != null}
        title={pendingAction?.title ?? "Reporte Z"}
        content={
          <div className="space-y-2">
            <p className="text-sm text-muted">
              {pendingAction?.requiresReportNumber
                ? "Indique el número de reporte Z para continuar."
                : "Puede indicar un número de reporte o dejar el campo vacío."}
            </p>
            <label className="block">
              <FieldLabel className="text-muted">
                Número de reporte (opcional)
              </FieldLabel>
              <input
                type="number"
                min={1}
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
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
            void run(pendingAction.id, reportNumber);
          }
        }}
        onCancel={closeModal}
      />
    </>
  );
}
