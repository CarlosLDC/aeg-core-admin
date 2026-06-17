"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EnajenacionSseEventLog } from "@/components/mqtt/enajenacion-sse-event-log";
import type { RitualTopics } from "@/hooks/use-enajenacion-ritual";
import type { PrinterResponse } from "@/types/printer";
import type { EnajenacionSseEvent } from "@/types/enajenacion-sse";

type EnajenacionTechnicalDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  printer: PrinterResponse;
  clientName: string;
  topics: RitualTopics;
  sessionStartedAt: string | null;
  sseEventLog: EnajenacionSseEvent[];
};

function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function EnajenacionTechnicalDetailsModal({
  open,
  onClose,
  printer,
  clientName,
  topics,
  sessionStartedAt,
  sseEventLog,
}: EnajenacionTechnicalDetailsModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
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

  if (!open) return null;

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
      <div className="relative flex max-h-[min(90vh,40rem)] w-[min(100%,36rem)] flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-base font-semibold text-card-foreground"
            >
              Detalles técnicos
            </h3>
            <p className="mt-1 text-sm text-muted">
              Serial{" "}
              <span className="font-mono text-card-foreground">
                {printer.fiscalSerial}
              </span>
            </p>
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

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted">MAC</dt>
              <dd className="mt-0.5 font-mono break-all text-card-foreground">
                {printer.macAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Cliente</dt>
              <dd className="mt-0.5 break-words text-card-foreground">
                {clientName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">CmdServer</dt>
              <dd className="mt-0.5 font-mono break-all text-card-foreground">
                {topics.cmdServer}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Comando</dt>
              <dd className="mt-0.5 font-mono break-all text-card-foreground">
                {topics.comando}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">
                Monitor MQTT (pestaña Monitor)
              </dt>
              <dd className="mt-0.5 font-mono break-all text-card-foreground">
                {topics.monitor}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Stream SSE</dt>
              <dd className="mt-0.5 font-mono break-all text-card-foreground">
                /api/mqtt/enajenacion/stream?mac={topics.mac}
              </dd>
            </div>
            {sessionStartedAt ? (
              <div>
                <dt className="text-xs font-medium text-muted">
                  Última sesión SSE
                </dt>
                <dd className="mt-0.5 text-card-foreground">
                  {formatSessionTime(sessionStartedAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5">
            <h4 className="text-xs font-medium text-muted">Eventos SSE</h4>
            <div className="mt-2">
              <EnajenacionSseEventLog
                events={sseEventLog}
                emptyMessage="Aún no hay eventos en esta conexión SSE."
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
