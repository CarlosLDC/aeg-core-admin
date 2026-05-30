"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { useConfirm } from "@/context/confirm-provider";
import type { PrinterResponse } from "@/types/printer";

type PrinterAssignmentDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  distributorOptions: SelectOption[];
  catalogLoading: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (distributorId: number) => void;
};

function resolveDefaultDistributorId(
  printer: PrinterResponse,
  distributorOptions: SelectOption[],
  lockDistributor: boolean,
  defaultDistributorId: number | null | undefined,
): string {
  if (lockDistributor && defaultDistributorId != null) {
    return String(defaultDistributorId);
  }
  if (!lockDistributor) {
    return "";
  }
  if (printer.distributorId != null) {
    return String(printer.distributorId);
  }
  return "";
}

export function PrinterAssignmentDialog({
  printer,
  saving,
  error,
  distributorOptions,
  catalogLoading,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterAssignmentDialogProps) {
  const confirm = useConfirm();
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [distributorOverride, setDistributorOverride] = useState<string | null>(
    null,
  );
  const [distributorQuery, setDistributorQuery] = useState("");

  const defaultDistributorSelection = useMemo(
    () =>
      resolveDefaultDistributorId(
        printer,
        distributorOptions,
        lockDistributor,
        defaultDistributorId,
      ),
    [printer, distributorOptions, lockDistributor, defaultDistributorId],
  );

  const distributorId = distributorOverride ?? defaultDistributorSelection;

  const selectedDistributorLabel = useMemo(() => {
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return distributorOptions.find((opt) => opt.id === id)?.label ?? null;
  }, [distributorId, distributorOptions]);
  const filteredDistributorOptions = useMemo(() => {
    const q = distributorQuery.trim().toLowerCase();
    if (!q) return distributorOptions;
    return distributorOptions.filter((opt) =>
      `${opt.id} ${opt.label}`.toLowerCase().includes(q),
    );
  }, [distributorOptions, distributorQuery]);

  const disabled = saving || catalogLoading;
  const selfAssign =
    lockDistributor && defaultDistributorId != null && defaultDistributorId > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);

    const accepted = await confirm({
      title: "Confirmar asignación",
      content: (
        <>
          <p className="text-sm text-muted">
            Vas a asignar la impresora{" "}
            <span className="font-mono text-card-foreground">
              {printer.fiscalSerial}
            </span>
            {selfAssign ? (
              <> a tu cartera</>
            ) : selectedDistributorLabel ? (
              <>
                {" "}
                a{" "}
                <strong className="text-card-foreground">
                  {selectedDistributorLabel}
                </strong>
              </>
            ) : null}
            . Esta acción actualiza el estado de la impresora.
          </p>
          <PrinterStatusTransition from="sin_asignar" to="asignada" />
        </>
      ),
      confirmLabel: "Asignar impresora",
      destructive: true,
    });
    if (!accepted) return;

    onSubmit(id);
  }

  return (
    <PrinterActionDialogShell
      title="Asignar impresora"
      titleId={titleId}
      printer={printer}
      saving={saving}
      error={error}
      onClose={onClose}
      submitLabel="Asignar impresora"
      onSubmit={handleSubmit}
      submitDisabled={
        disabled ||
        !distributorId ||
        (!selfAssign && distributorOptions.length === 0)
      }
      submitLoading={saving}
    >
      {selfAssign ? (
        <p className="text-sm text-muted">
          La impresora quedará asignada a tu cartera con estatus{" "}
          <span className="font-medium text-card-foreground">Asignada</span>.
        </p>
      ) : (
        <>
          <PrinterActionPickerPanel
            label="Distribuidora"
            searchPlaceholder="Buscar distribuidora por nombre o ID…"
            query={distributorQuery}
            onQueryChange={setDistributorQuery}
            options={filteredDistributorOptions}
            selectedValue={distributorId}
            onSelect={(value) => {
              setDistributorOverride(value);
              setFieldError(null);
            }}
            loading={catalogLoading}
            disabled={disabled}
            emptyMessage="Sin distribuidoras disponibles"
            noResultsMessage="Sin resultados"
          />
          {fieldError ? (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
              {fieldError}
            </p>
          ) : null}
        </>
      )}
    </PrinterActionDialogShell>
  );
}
