"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  FileSearch,
  ScrollText,
  Send,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionCard,
  ToolsSectionGrid,
  ToolsSectionHeading,
  toolsSubsectionClass,
} from "@/components/tools/tools-ui";
import { ToolsReportZModal } from "@/components/tools/tools-report-z-modal";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  generateToolsReportZ,
  getToolsMqttErrorMessage,
  getToolsReportZ,
  getToolsReportZErrorMessage,
  listToolsReportZ,
  sendToolsReportX,
  transmitToolsReportZ,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

type ReportAction = "list" | "generate" | "get" | "transmit" | "report-x";

type ReportZActionConfig = {
  id: ReportAction;
  title: string;
  description: string;
  confirmMessage: string;
  icon: LucideIcon;
  confirmOnly?: boolean;
  requiresReportNumber?: boolean;
};

const REPORT_Z_ACTIONS: ReportZActionConfig[] = [
  {
    id: "list",
    title: "Consultar último Z",
    description: "Consulta el último reporte Z registrado en la impresora.",
    confirmMessage: "¿Consultar el último reporte Z registrado en la impresora?",
    icon: ClipboardList,
    confirmOnly: true,
  },
  {
    id: "get",
    title: "Consultar Z específico",
    description: "Consulta un reporte Z por su número.",
    confirmMessage: "Indique el número exacto del reporte Z que desea consultar.",
    icon: FileSearch,
    requiresReportNumber: true,
  },
  {
    id: "generate",
    title: "Generar Z",
    description: "Genera un nuevo reporte Z en la impresora.",
    confirmMessage: "¿Generar un nuevo reporte Z en la impresora?",
    icon: ScrollText,
    confirmOnly: true,
  },
  {
    id: "transmit",
    title: "Transmitir al SENIAT",
    description: "Envía el último reporte Z al SENIAT.",
    confirmMessage: "¿Transmitir el último reporte Z al SENIAT?",
    icon: Send,
    confirmOnly: true,
  },
  {
    id: "report-x",
    title: "Generar reporte X",
    description: "Genera un reporte X en la impresora.",
    confirmMessage: "¿Generar un reporte X en la impresora?",
    icon: BarChart3,
    confirmOnly: true,
  },
];

function parseReportNumberInput(numberInput: string): number | null {
  const trimmed = numberInput.trim();
  if (!trimmed) {
    return null;
  }

  const parsedNumber = Number(trimmed);
  if (!Number.isFinite(parsedNumber) || parsedNumber <= 0) {
    return null;
  }

  return Math.trunc(parsedNumber);
}

type ToolsReporteZSectionProps = {
  printer: ToolsPrinter;
  remoteActionsDisabled?: boolean;
};

export function ToolsReporteZSection({
  printer,
  remoteActionsDisabled: remoteActionsDisabledProp,
}: ToolsReporteZSectionProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reporteZ;
  const internalConnection = useToolsPrinterConnection(
    remoteActionsDisabledProp !== undefined ? null : printer.id,
    remoteActionsDisabledProp !== undefined ? null : printer.macAddress,
  );
  const remoteActionsDisabled =
    remoteActionsDisabledProp ?? internalConnection.remoteActionsDisabled;
  const [pendingAction, setPendingAction] = useState<ReportZActionConfig | null>(
    null,
  );
  const [reportNumber, setReportNumber] = useState("");
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState<ReportAction | null>(null);

  const showReport = (report: Record<string, unknown> | undefined) => {
    if (report) {
      setReportData(report);
    }
  };

  const closeReportModal = () => {
    setReportData(null);
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
    const parsedNumber = parseReportNumberInput(numberInput);

    if (config?.requiresReportNumber && parsedNumber == null) {
      toast.error(
        numberInput.trim().length === 0
          ? "Indique el número del reporte Z."
          : "Indique un número de reporte Z válido.",
      );
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
        const result = await getToolsReportZ(printer.id, parsedNumber!);
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
      } else if (action === "report-x") {
        const result = await sendToolsReportX(printer.id);
        toast.success(result.message ?? "Reporte X enviado.");
      }
      setPendingAction(null);
      setReportNumber("");
    } catch (err) {
      toast.error(
        action === "report-x"
          ? getToolsMqttErrorMessage(err)
          : getToolsReportZErrorMessage(
              err,
              config?.requiresReportNumber ? parsedNumber ?? undefined : undefined,
            ),
      );
    } finally {
      setLoading(null);
    }
  };

  const requiresReportNumber = pendingAction?.requiresReportNumber === true;
  const confirmOnly = pendingAction?.confirmOnly === true;

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
              disabled={
                remoteActionsDisabled ||
                (loading != null && loading !== action.id)
              }
              onClick={() => openAction(action)}
            />
          ))}
        </ToolsSectionGrid>
      </section>

      <ToolsReportZModal
        open={reportData != null}
        report={reportData}
        onClose={closeReportModal}
      />

      <ConfirmDialog
        open={pendingAction != null}
        title={pendingAction?.title ?? "Reporte Z"}
        message={confirmOnly ? pendingAction?.confirmMessage : undefined}
        content={
          requiresReportNumber ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">{pendingAction?.confirmMessage}</p>
              <label className="block">
                <FieldLabel className="text-muted">
                  Número de reporte
                </FieldLabel>
                <input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className={formFieldInputClass}
                  autoFocus
                />
              </label>
            </div>
          ) : undefined
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
