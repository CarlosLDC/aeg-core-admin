"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { FieldLabel } from "@/components/ui/field-label";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { formatDate } from "@/lib/datetime-form";
import {
  deletePrinterCreditPayment,
  fetchPrinterCreditSummary,
  getPrinterCreditErrorMessage,
  registerPrinterCreditPayment,
  updatePrinterCreditPlan,
} from "@/lib/printer-credit-api";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterCreditSummaryResponse } from "@/types/printer-credit";

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type PrinterCreditPaymentsSectionProps = {
  printer: PrinterResponse;
  isAdmin: boolean;
  onPrinterUpdated: () => Promise<void> | void;
};

export function PrinterCreditPaymentsSection({
  printer,
  isAdmin,
  onPrinterUpdated,
}: PrinterCreditPaymentsSectionProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [summary, setSummary] = useState<PrinterCreditSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan de cuotas
  const [editingPlan, setEditingPlan] = useState(false);
  const [planInstallments, setPlanInstallments] = useState(
    printer.creditInstallments != null ? String(printer.creditInstallments) : "1",
  );
  const [planPrice, setPlanPrice] = useState(
    printer.finalSalePrice != null ? String(printer.finalSalePrice) : "",
  );
  const [savingPlan, setSavingPlan] = useState(false);

  // Nuevo pago
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrinterCreditSummary(printer.id);
      setSummary(data);
      setPlanInstallments(
        data.creditInstallments != null ? String(data.creditInstallments) : "1",
      );
      setPlanPrice(
        data.finalSalePrice != null ? String(data.finalSalePrice) : "",
      );
    } catch (err) {
      setError(getPrinterCreditErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [printer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSavePlan(event: FormEvent) {
    event.preventDefault();
    const n = Number(planInstallments.trim());
    if (!Number.isInteger(n) || n < 1) {
      toast.error("El número de cuotas debe ser un entero mayor o igual a 1.");
      return;
    }
    let price: number | null = null;
    if (planPrice.trim()) {
      const parsed = Number(planPrice.trim());
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("El monto total no puede ser negativo.");
        return;
      }
      price = parsed;
    }

    setSavingPlan(true);
    try {
      const updated = await updatePrinterCreditPlan(printer.id, {
        creditInstallments: n,
        finalSalePrice: price,
      });
      setSummary(updated);
      setEditingPlan(false);
      toast.success("Plan de cuotas actualizado.");
      await onPrinterUpdated();
    } catch (err) {
      toast.error(getPrinterCreditErrorMessage(err));
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleRegisterPayment(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount.trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("El monto del pago debe ser mayor que cero.");
      return;
    }
    if (!paymentDate.trim()) {
      toast.error("La fecha de pago es obligatoria.");
      return;
    }

    setSavingPayment(true);
    try {
      const updated = await registerPrinterCreditPayment(printer.id, {
        amount: parsedAmount,
        paymentDate: paymentDate.trim(),
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        markAsPaid,
      });
      setSummary(updated);
      setAmount("");
      setReference("");
      setNotes("");
      setMarkAsPaid(false);
      toast.success(
        markAsPaid
          ? "Pago registrado e impresora marcada como Enajenada (Pagada)."
          : "Pago de cuota registrado.",
      );
      await onPrinterUpdated();
    } catch (err) {
      toast.error(getPrinterCreditErrorMessage(err));
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(paymentId: number) {
    const ok = await confirm({
      title: "Eliminar pago",
      message: "¿Eliminar este registro de pago? Esta acción actualizará el total abonado.",
      destructive: true,
    });
    if (!ok) return;

    try {
      const updated = await deletePrinterCreditPayment(printer.id, paymentId);
      setSummary(updated);
      toast.success("Pago eliminado.");
      await onPrinterUpdated();
    } catch (err) {
      toast.error(getPrinterCreditErrorMessage(err));
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Cargando información de crédito y pagos…
      </div>
    );
  }

  const currentStatus = summary?.status ?? printer.status;
  const installments = summary?.creditInstallments ?? printer.creditInstallments;
  const paymentCount = summary?.paymentCount ?? printer.creditPaymentCount ?? 0;
  const totalPaid = summary?.totalPaid ?? printer.creditPaidTotal ?? 0;
  const salePrice = summary?.finalSalePrice ?? printer.finalSalePrice;
  const remaining = summary?.remainingBalance;
  const canRecordPayments =
    isAdmin && (currentStatus === "a_credito" || currentStatus === "enajenada");

  const progressPct =
    installments != null && installments > 0
      ? Math.min(100, Math.round((paymentCount / installments) * 100))
      : null;

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <DetailSection
        title="Plan de cuotas a crédito"
        layout="quad"
      >
        <p className="sm:col-span-4 text-xs text-muted">
          Seguimiento de cuotas pactadas y saldo acumulado para esta impresora.
        </p>
        <DetailField
          label="Cuotas pactadas"
          value={
            installments != null
              ? `${installments} cuota${installments === 1 ? "" : "s"}`
              : "Sin definir"
          }
        />
        <DetailField
          label="Pagos registrados"
          value={
            installments != null
              ? `${paymentCount} de ${installments}`
              : String(paymentCount)
          }
        />
        <DetailField label="Total abonado" value={formatMoney(totalPaid)} />
        <DetailField
          label={salePrice != null ? "Saldo pendiente" : "Precio total"}
          value={
            salePrice != null
              ? `${formatMoney(remaining)} (de ${formatMoney(salePrice)})`
              : "Sin definir"
          }
        />

        {progressPct != null ? (
          <div className="sm:col-span-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Progreso de cuotas</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="sm:col-span-4 pt-1">
            {!editingPlan ? (
              <button
                type="button"
                onClick={() => setEditingPlan(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                {installments != null ? "Editar cuotas / monto" : "Definir cuotas"}
              </button>
            ) : (
              <form
                onSubmit={(e) => void handleSavePlan(e)}
                className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-foreground/[0.02] p-4 sm:grid-cols-3"
              >
                <div>
                  <FieldLabel required>
                    Cantidad de cuotas
                  </FieldLabel>
                  <input
                    id="credit-plan-installments"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={planInstallments}
                    onChange={(e) => setPlanInstallments(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <FieldLabel>
                    Precio total (opcional)
                  </FieldLabel>
                  <input
                    id="credit-plan-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="Ej. 450.00"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={savingPlan}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {savingPlan ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(false)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </DetailSection>

      {canRecordPayments ? (
        <DetailSection title="Registrar pago de cuota">
          <p className="sm:col-span-2 text-xs text-muted">
            Registra el monto y la fecha de cada abono recibido.
          </p>
          <form
            onSubmit={(e) => void handleRegisterPayment(e)}
            className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <FieldLabel required>
                Monto
              </FieldLabel>
              <input
                id="credit-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 125.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <FieldLabel required>
                Fecha de pago
              </FieldLabel>
              <input
                id="credit-payment-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <FieldLabel>
                Referencia (opcional)
              </FieldLabel>
              <input
                id="credit-payment-reference"
                type="text"
                maxLength={120}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. Transferencia #4821"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <FieldLabel>
                Notas (opcional)
              </FieldLabel>
              <input
                id="credit-payment-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cuota 1 de 4"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            {currentStatus === "a_credito" ? (
              <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="size-4 rounded border-border accent-accent"
                />
                <span>
                  Marcar impresora como totalmente pagada (cambiar estatus a{" "}
                  <strong>Enajenada</strong>)
                </span>
              </label>
            ) : (
              <div className="hidden lg:col-span-3 lg:block" />
            )}

            <div className="flex justify-end sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                disabled={savingPayment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {savingPayment ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Registrar pago
              </button>
            </div>
          </form>
        </DetailSection>
      ) : null}

      <DetailSection title="Historial de pagos registrados">
        {!summary || summary.payments.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no hay pagos registrados para esta impresora.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Monto</th>
                  <th className="px-4 py-2.5 font-medium">Referencia</th>
                  <th className="px-4 py-2.5 font-medium">Notas</th>
                  <th className="px-4 py-2.5 font-medium">Registrado por</th>
                  {isAdmin ? (
                    <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {summary.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {payment.reference || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {payment.notes || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {payment.registeredByName || "—"}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeletePayment(payment.id)}
                          title="Eliminar pago"
                          aria-label="Eliminar pago"
                          className="inline-flex items-center rounded-md p-1.5 text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>
    </div>
  );
}
