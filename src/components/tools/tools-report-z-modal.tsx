"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  TOOLS_REPORT_Z_SECTIONS,
  formatToolsReportZFieldValue,
  listToolsReportZExtraFields,
  resolveToolsReportZNumber,
} from "@/lib/tools-report-z-view";
import { cn } from "@/lib/utils";

type ToolsReportZModalProps = {
  open: boolean;
  report: Record<string, unknown> | null;
  onClose: () => void;
};

function ReportZFieldGrid({
  fields,
  report,
}: {
  fields: Array<{ key: string; label: string; kind: "currency" | "number" | "text" }>;
  report: Record<string, unknown>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.key}
          className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
        >
          <dt className="text-xs font-medium text-muted">{field.label}</dt>
          <dd
            className={cn(
              "mt-1 text-sm text-foreground",
              field.kind === "currency" && "font-medium tabular-nums",
              field.kind === "number" && "font-medium tabular-nums",
            )}
          >
            {formatToolsReportZFieldValue(report[field.key], field.kind)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ToolsReportZModal({
  open,
  report,
  onClose,
}: ToolsReportZModalProps) {
  const titleId = useId();
  const reportNumber = report ? resolveToolsReportZNumber(report) : null;
  const extraFields = report ? listToolsReportZExtraFields(report) : [];

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Enter") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !report) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-[min(100%,48rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-base font-semibold text-card-foreground"
            >
              {reportNumber != null
                ? `Reporte Z #${reportNumber}`
                : "Detalles del reporte Z"}
            </h3>
            {report.FechaInicioJornada ? (
              <p className="mt-1 text-sm text-muted">
                Jornada iniciada el {String(report.FechaInicioJornada)}
                {report.HoraInicioJornada
                  ? ` a las ${String(report.HoraInicioJornada)}`
                  : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            {TOOLS_REPORT_Z_SECTIONS.map((section) => (
              <section key={section.title}>
                <h4 className="mb-3 text-sm font-semibold text-card-foreground">
                  {section.title}
                </h4>
                <ReportZFieldGrid fields={section.fields} report={report} />
              </section>
            ))}

            {extraFields.length > 0 ? (
              <section>
                <h4 className="mb-3 text-sm font-semibold text-card-foreground">
                  Otros datos
                </h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {extraFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                    >
                      <dt className="text-xs font-medium text-muted">
                        {field.key}
                      </dt>
                      <dd className="mt-1 break-all text-sm text-foreground">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
