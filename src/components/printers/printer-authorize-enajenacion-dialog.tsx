"use client";

import { FormEvent, useId, useState } from "react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { useToast } from "@/context/toast-provider";
import { authorizePrinterEnajenacion, getPrintersErrorMessage } from "@/lib/printers-api";
import type { PrinterResponse } from "@/types/printer";

type PrinterAuthorizeEnajenacionDialogProps = {
  printer: PrinterResponse;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
};

export function PrinterAuthorizeEnajenacionDialog({
  printer,
  onClose,
  onUpdated,
}: PrinterAuthorizeEnajenacionDialogProps) {
  const titleId = useId();
  const toast = useToast();

  const [creditInstallments, setCreditInstallments] = useState(
    printer.creditInstallments != null ? String(printer.creditInstallments) : "1",
  );
  const [finalSalePrice, setFinalSalePrice] = useState(
    printer.finalSalePrice != null ? String(printer.finalSalePrice) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedInstallments = Number(creditInstallments.trim());
    if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1) {
      setError("Debes indicar un número de cuotas válido (entero mayor o igual a 1).");
      return;
    }

    let parsedPrice: number | null = null;
    if (finalSalePrice.trim()) {
      const n = Number(finalSalePrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        setError("El monto total de venta no puede ser negativo.");
        return;
      }
      parsedPrice = n;
    }

    setSaving(true);
    try {
      await authorizePrinterEnajenacion(printer.id, {
        creditInstallments: parsedInstallments,
        finalSalePrice: parsedPrice,
      });
      toast.success(
        `Permiso para enajenar ${printer.fiscalSerial} otorgado (${parsedInstallments} cuota${parsedInstallments === 1 ? "" : "s"}).`,
      );
      await onUpdated();
      onClose();
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PrinterActionDialogShell
      title={`Dar permiso para enajenar · ${printer.fiscalSerial}`}
      titleId={titleId}
      printer={printer}
      showPrinterSerialSubtitle={false}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={(e) => void handleSubmit(e)}
      submitLabel="Dar permiso"
      cancelLabel="Cancelar"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <p className="text-sm text-muted">
          Autoriza la enajenación de esta impresora en estatus{" "}
          <strong className="text-foreground">En consignación</strong>. Al otorgar
          el permiso, se habilitará el botón{" "}
          <strong className="text-foreground">Enajenar</strong> y la impresora
          pasará al estatus <strong className="text-foreground">A crédito</strong>{" "}
          al completar la enajenación.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>
              Cuotas pactadas
            </FieldLabel>
            <input
              id="grant-credit-installments"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              value={creditInstallments}
              onChange={(e) => setCreditInstallments(e.target.value)}
              placeholder="Ej. 4"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <FieldLabel>
              Monto total de venta (opcional)
            </FieldLabel>
            <input
              id="grant-final-sale-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={finalSalePrice}
              onChange={(e) => setFinalSalePrice(e.target.value)}
              placeholder="Ej. 450.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>
    </PrinterActionDialogShell>
  );
}
