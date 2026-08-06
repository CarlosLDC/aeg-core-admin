"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import type { PrinterDependencyRef } from "@/types/printer-dependencies";
import {
  annualInspectionPath,
  clientPath,
  sealPath,
  technicalServicePath,
} from "@/lib/resource-routes";

function dependencyHref(dep: PrinterDependencyRef): string | null {
  switch (dep.type) {
    case "client":
      return clientPath(dep.id);
    case "seal":
      return sealPath(dep.id);
    case "technicalService":
      return technicalServicePath(dep.id);
    case "annualInspection":
      return annualInspectionPath(dep.id);
    default:
      return null;
  }
}

function dependencyKindLabel(type: string): string {
  switch (type) {
    case "client":
      return "Cliente";
    case "seal":
      return "Precinto";
    case "technicalService":
      return "Servicio técnico";
    case "annualInspection":
      return "Inspección anual";
    default:
      return "Registro";
  }
}

type PrinterDeleteBlockedDialogProps = {
  open: boolean;
  printerLabel: string;
  message: string;
  dependencies: PrinterDependencyRef[];
  consequences: string[];
  forcing?: boolean;
  onClose: () => void;
  onForceDelete: () => void | Promise<void>;
};

export function PrinterDeleteBlockedDialog({
  open,
  printerLabel,
  message,
  dependencies,
  consequences,
  forcing = false,
  onClose,
  onForceDelete,
}: PrinterDeleteBlockedDialogProps) {
  const [ack, setAck] = useState(false);

  if (!open) return null;

  return (
    <div
      key={printerLabel}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="printer-delete-blocked-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        disabled={forcing}
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-destructive/40 bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
              <AlertTriangle className="size-3.5" aria-hidden />
              Borrado destructivo
            </div>
            <h2
              id="printer-delete-blocked-title"
              className="text-lg font-semibold text-card-foreground"
            >
              «{printerLabel}» tiene registros vinculados
            </h2>
            <p className="mt-2 text-sm text-muted">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={forcing}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {consequences.length > 0 ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Consecuencias si continúas
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-card-foreground">
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {dependencies.length > 0 ? (
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
            {dependencies.map((dep) => {
              const href = dependencyHref(dep);
              return (
                <li
                  key={`${dep.type}-${dep.id}`}
                  className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        {dependencyKindLabel(dep.type)}
                      </p>
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {dep.label}
                      </p>
                    </div>
                    {href ? (
                      <Link
                        href={href}
                        onClick={onClose}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
                      >
                        Abrir
                        <ExternalLink className="size-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-card-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-destructive"
            checked={ack}
            disabled={forcing}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            Entiendo que esta acción es irreversible y acepto las consecuencias
            anteriores (pensado para entornos de prueba).
          </span>
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={forcing}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ack || forcing}
            onClick={() => {
              void onForceDelete();
            }}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          >
            {forcing ? "Eliminando…" : "Eliminar de todas formas"}
          </button>
        </div>
      </div>
    </div>
  );
}
