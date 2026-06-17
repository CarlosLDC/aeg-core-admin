"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { RitualTopics } from "@/hooks/use-enajenacion-ritual";
import type { PrinterResponse } from "@/types/printer";

type EnajenacionTechnicalDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  printer: PrinterResponse;
  topics: RitualTopics;
  ritualAnchorAt: number | null;
};

function formatAnchorTime(anchorAt: number): string {
  return new Date(anchorAt).toLocaleString();
}

export function EnajenacionTechnicalDetailsModal({
  open,
  onClose,
  printer,
  topics,
  ritualAnchorAt,
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
      <div className="relative flex max-h-[min(85vh,40rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted">MAC</dt>
              <dd className="mt-1 font-mono break-all text-card-foreground">
                {printer.macAddress}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Cliente</dt>
              <dd className="mt-1 text-card-foreground">#{printer.clientId}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted">CmdServer</dt>
              <dd className="mt-1 font-mono break-all text-card-foreground">
                {topics.cmdServer}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted">Comando</dt>
              <dd className="mt-1 font-mono break-all text-card-foreground">
                {topics.comando}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted">Monitor</dt>
              <dd className="mt-1 font-mono break-all text-card-foreground">
                {topics.monitor}
              </dd>
            </div>
            {ritualAnchorAt !== null ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-muted">Sesión anclada</dt>
                <dd className="mt-1 text-card-foreground">
                  {formatAnchorTime(ritualAnchorAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>,
    document.body,
  );
}
