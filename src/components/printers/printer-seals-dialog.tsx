"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  History,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Unlink,
  X,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { SealColorBadge } from "@/components/seals/seal-color-badge";
import { SealStatusBadge } from "@/components/seals/seal-status-badge";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { toDatetimeLocalValue } from "@/lib/datetime-form";
import {
  createAndInstallSeal,
  getAvailableSeals,
  getPrinterSealsSummary,
  installSealOnPrinter,
  retireCurrentSeal,
  unlinkSealFromPrinter,
} from "@/lib/printer-seals";
import { getSealsErrorMessage } from "@/lib/seals-api";
import { SEAL_COLORS, type SealColor, type SealResponse } from "@/types/seal";
import { SEAL_COLOR_LABELS } from "@/lib/seal-form";
import type { PrinterResponse } from "@/types/printer";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { cn } from "@/lib/utils";

type PrinterSealsDialogProps = {
  open: boolean;
  printer: PrinterResponse;
  seals: SealResponse[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

type ActiveTab = "assign" | "create";

export function PrinterSealsDialog({
  open,
  printer,
  seals,
  onClose,
  onRefresh,
}: PrinterSealsDialogProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const { activeSeal, historicalSeals } = useMemo(
    () => getPrinterSealsSummary(seals, printer.id),
    [seals, printer.id],
  );

  const availableSeals = useMemo(() => getAvailableSeals(seals), [seals]);

  const [tab, setTab] = useState<ActiveTab>(
    availableSeals.length > 0 ? "assign" : "create",
  );

  // Assign existing seal state
  const [selectedSealId, setSelectedSealId] = useState<string>(
    availableSeals[0] ? String(availableSeals[0].id) : "",
  );
  const [assignDate, setAssignDate] = useState<string>(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );

  // Create new seal state
  const [newSerial, setNewSerial] = useState("");
  const [newColor, setNewColor] = useState<SealColor>("azul");
  const [newDate, setNewDate] = useState<string>(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleAssignSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSealId) {
      setError("Selecciona un precinto disponible.");
      return;
    }

    const sealToInstall = availableSeals.find(
      (s) => String(s.id) === selectedSealId,
    );
    if (!sealToInstall) {
      setError("El precinto seleccionado no está disponible.");
      return;
    }

    if (activeSeal) {
      const confirmed = await confirm({
        title: "Confirmar sustitución de precinto",
        message: `La impresora ya tiene el precinto ${activeSeal.serial} instalado. Al continuar, este pasará a estatus «Sustituido» y se instalará el nuevo precinto ${sealToInstall.serial}. ¿Deseas continuar?`,
      });
      if (!confirmed) return;
    }

    setSaving(true);
    setError(null);

    try {
      await installSealOnPrinter({
        seal: sealToInstall,
        printerId: printer.id,
        previousActiveSeal: activeSeal,
        installationDate: assignDate,
      });

      toast.success(
        `Precinto ${sealToInstall.serial} instalado correctamente en la impresora ${printer.fiscalSerial}.`,
      );
      await onRefresh();
      onClose();
    } catch (err) {
      const msg = getSealsErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    const serial = newSerial.trim();
    if (!serial) {
      setError("El serial del nuevo precinto es obligatorio.");
      return;
    }

    if (activeSeal) {
      const confirmed = await confirm({
        title: "Confirmar sustitución de precinto",
        message: `La impresora ya tiene el precinto ${activeSeal.serial} instalado. Al crear e instalar el nuevo precinto ${serial}, el actual pasará a estatus «Sustituido». ¿Deseas continuar?`,
      });
      if (!confirmed) return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createAndInstallSeal({
        serial,
        color: newColor,
        printerId: printer.id,
        installationDate: newDate,
        previousActiveSeal: activeSeal,
      });

      toast.success(
        `Precinto ${created.serial} creado e instalado en la impresora ${printer.fiscalSerial}.`,
      );
      await onRefresh();
      onClose();
    } catch (err) {
      const msg = getSealsErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleRetireActive() {
    if (!activeSeal) return;

    const confirmed = await confirm({
      title: "Confirmar retiro de precinto",
      message: `¿Retirar el precinto ${activeSeal.serial}? Pasará a estatus «Sustituido» y la impresora quedará sin precinto activo.`,
      destructive: true,
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await retireCurrentSeal({
        seal: activeSeal,
        removalDate: new Date().toISOString(),
      });

      toast.success(
        `Precinto ${activeSeal.serial} retirado (marcado como sustituido).`,
      );
      await onRefresh();
    } catch (err) {
      const msg = getSealsErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlinkActive() {
    if (!activeSeal) return;

    const confirmed = await confirm({
      title: "Desvincular precinto",
      message: `¿Desvincular el precinto ${activeSeal.serial} de esta impresora? Volverá al estatus «Disponible» para poder asignarse a otro equipo.`,
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await unlinkSealFromPrinter({
        seal: activeSeal,
      });

      toast.success(
        `Precinto ${activeSeal.serial} desvinculado (ahora disponible).`,
      );
      await onRefresh();
    } catch (err) {
      const msg = getSealsErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-seals-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        aria-label="Cerrar modal"
        onClick={onClose}
        disabled={saving}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2
                id="printer-seals-modal-title"
                className="text-lg font-semibold text-card-foreground"
              >
                Gestión de precintos
              </h2>
              <p className="text-xs text-muted">
                Impresora fiscal{" "}
                <strong className="font-mono text-card-foreground">
                  {printer.fiscalSerial}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        {/* Current Active Seal Section */}
        <div className="mb-6 rounded-xl border border-border bg-foreground/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Precinto activo actual
          </p>
          {activeSeal ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-card-foreground">
                    {activeSeal.serial}
                  </span>
                  <SealColorBadge color={activeSeal.color} />
                  <SealStatusBadge status={activeSeal.status} />
                </div>
                {activeSeal.installationDate ? (
                  <p className="text-xs text-muted">
                    Instalado el{" "}
                    {toDatetimeLocalValue(activeSeal.installationDate).replace(
                      "T",
                      " ",
                    )}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRetireActive()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5"
                  title="Marcar como sustituido y retirar de la impresora"
                >
                  <ShieldAlert className="size-3.5" />
                  Retirar
                </button>
                <button
                  type="button"
                  onClick={() => void handleUnlinkActive()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-foreground/5"
                  title="Liberar precinto para dejarlo en estatus disponible"
                >
                  <Unlink className="size-3.5" />
                  Desvincular
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
              <ShieldAlert className="size-4 text-amber-500" />
              <span>Sin precinto fiscal activo instalado.</span>
            </div>
          )}
        </div>

        {/* Action Tabs */}
        <div className="mb-4 flex border-b border-border">
          <button
            type="button"
            onClick={() => {
              setTab("assign");
              setError(null);
            }}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === "assign"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-card-foreground",
            )}
          >
            <Tag className="size-4" />
            Asignar existente ({availableSeals.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("create");
              setError(null);
            }}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === "create"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-card-foreground",
            )}
          >
            <Plus className="size-4" />
            Registrar nuevo
          </button>
        </div>

        {tab === "assign" ? (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            {availableSeals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-6 text-center">
                <p className="text-sm text-muted">
                  No hay precintos en estatus «Disponible».
                </p>
                <button
                  type="button"
                  onClick={() => setTab("create")}
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                >
                  Registrar un precinto nuevo para esta impresora →
                </button>
              </div>
            ) : (
              <>
                <label className="block">
                  <FieldLabel required>Precinto disponible</FieldLabel>
                  <select
                    required
                    value={selectedSealId}
                    disabled={saving}
                    onChange={(e) => setSelectedSealId(e.target.value)}
                    className={formFieldInputClass}
                  >
                    {availableSeals.map((seal) => (
                      <option key={seal.id} value={seal.id}>
                        {seal.serial} — {SEAL_COLOR_LABELS[seal.color]} (ID #
                        {seal.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <FieldLabel required>Fecha y hora de instalación</FieldLabel>
                  <input
                    type="datetime-local"
                    required
                    value={assignDate}
                    disabled={saving}
                    onChange={(e) => setAssignDate(e.target.value)}
                    className={formFieldInputClass}
                  />
                </label>

                {activeSeal ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <strong>Atención:</strong> El precinto actual{" "}
                      <span className="font-mono font-bold">
                        {activeSeal.serial}
                      </span>{" "}
                      será sustituido automáticamente y pasará al historial de
                      la impresora.
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Instalando…
                      </>
                    ) : (
                      "Instalar precinto"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Serial del precinto</FieldLabel>
                <input
                  type="text"
                  required
                  placeholder="SN-12345"
                  value={newSerial}
                  disabled={saving}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className={cn(formFieldInputClass, "font-mono")}
                />
              </label>
              <label className="block">
                <FieldLabel required>Color</FieldLabel>
                <select
                  required
                  value={newColor}
                  disabled={saving}
                  onChange={(e) => setNewColor(e.target.value as SealColor)}
                  className={formFieldInputClass}
                >
                  {SEAL_COLORS.map((color) => (
                    <option key={color} value={color}>
                      {SEAL_COLOR_LABELS[color]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <FieldLabel required>Fecha y hora de instalación</FieldLabel>
              <input
                type="datetime-local"
                required
                value={newDate}
                disabled={saving}
                onChange={(e) => setNewDate(e.target.value)}
                className={formFieldInputClass}
              />
            </label>

            {activeSeal ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  <strong>Atención:</strong> El precinto actual{" "}
                  <span className="font-mono font-bold">
                    {activeSeal.serial}
                  </span>{" "}
                  será sustituido automáticamente y pasará al historial de la
                  impresora.
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Crear e instalar precinto"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
