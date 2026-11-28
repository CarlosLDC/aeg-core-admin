"use client";

import { FormEvent, useMemo, useState } from "react";
import { Banknote, Building2, ReceiptText } from "lucide-react";
import { AssignmentPaymentsSection } from "@/components/printers/assignment-payments-section";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { matchesSearch } from "@/components/ui/searchable-select";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { formatMoney } from "@/lib/datetime-form";
import { can } from "@/lib/permissions/can";
import {
  assignmentOutcomeHint,
  assignmentPaymentsToRequest,
  createEmptyAssignmentPaymentDraft,
  getAssignmentWizardSteps,
  hasAssignmentPaymentDetails,
  resolveAssignmentStepSubtitle,
  resolveAssignmentSubmitLabel,
  sumAssignmentPaymentAmounts,
  validateAssignmentPaymentDraft,
  type AssignmentPaymentDraft,
  type AssignmentPaymentPayload,
  type AssignmentWizardStep,
} from "@/lib/printer-assignment-wizard";
import { printerPaidLabel } from "@/lib/printer-form";
import { cn } from "@/lib/utils";
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
  onSubmit: (payload: {
    distributorId: number;
    paid: boolean;
    assignmentPayments?: AssignmentPaymentPayload[];
  }) => void;
};

const STEP_ICONS = {
  1: Building2,
  2: Banknote,
  3: ReceiptText,
} as const;

function resolveDefaultDistributorId(
  printer: PrinterResponse,
  lockDistributor: boolean,
  defaultDistributorId: number | null | undefined,
): string {
  if (lockDistributor && defaultDistributorId != null) {
    return String(defaultDistributorId);
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
  const { user } = useAuth();
  const confirm = useConfirm();

  const [step, setStep] = useState<AssignmentWizardStep>(1);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [distributorOverride, setDistributorOverride] = useState<string | null>(
    null,
  );
  const [distributorQuery, setDistributorQuery] = useState("");
  const [paidOverride, setPaidOverride] = useState<boolean | null>(null);
  const [payments, setPayments] = useState<AssignmentPaymentDraft[]>([]);
  const [composerDraft, setComposerDraft] = useState<AssignmentPaymentDraft>(
    () => createEmptyAssignmentPaymentDraft("composer"),
  );
  const [editingPaymentKey, setEditingPaymentKey] = useState<string | null>(
    null,
  );
  const paid = paidOverride ?? printer.paid;

  const selfAssign =
    lockDistributor && defaultDistributorId != null && defaultDistributorId > 0;
  const canCreatePayments = user
    ? can(user.role, "commercialPayments", "create")
    : false;
  const showPayments = !selfAssign && canCreatePayments;

  const defaultDistributorSelection = useMemo(
    () =>
      resolveDefaultDistributorId(
        printer,
        lockDistributor,
        defaultDistributorId,
      ),
    [printer, lockDistributor, defaultDistributorId],
  );

  const distributorId = distributorOverride ?? defaultDistributorSelection;
  const parsedDistributorId = Number(distributorId);
  const hasValidDistributor =
    Number.isFinite(parsedDistributorId) && parsedDistributorId > 0;

  const selectedDistributorOption = useMemo(() => {
    if (!hasValidDistributor) return null;
    return (
      distributorOptions.find((opt) => opt.id === parsedDistributorId) ?? null
    );
  }, [hasValidDistributor, parsedDistributorId, distributorOptions]);
  const selectedDistributorLabel = selectedDistributorOption?.label ?? null;

  const filteredDistributorOptions = useMemo(() => {
    if (!distributorQuery.trim()) return distributorOptions;
    return distributorOptions.filter((opt) =>
      matchesSearch(
        distributorQuery,
        `${opt.id} ${opt.label}`,
        `${opt.searchText ?? ""} ${opt.rif ?? ""} ${opt.description ?? ""}`,
      ),
    );
  }, [distributorOptions, distributorQuery]);

  const disabled = saving || catalogLoading;
  const wizardSteps = useMemo(
    () => getAssignmentWizardSteps(showPayments),
    [showPayments],
  );

  function goToStep(target: AssignmentWizardStep) {
    if (saving) return;
    if (!showPayments && target === 3) return;
    if (target > 1 && !hasValidDistributor) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);
    setComposerError(null);
    setStep(target);
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  function handleAddOrSavePayment() {
    const validated = validateAssignmentPaymentDraft(composerDraft, {
      requireDetails: true,
    });
    if (typeof validated === "string") {
      setComposerError(validated);
      return;
    }

    if (editingPaymentKey) {
      setPayments((prev) =>
        prev.map((row) =>
          row.key === editingPaymentKey
            ? { ...composerDraft, key: editingPaymentKey, mode: "manual" }
            : row,
        ),
      );
      setEditingPaymentKey(null);
    } else {
      setPayments((prev) => [
        ...prev,
        {
          ...composerDraft,
          key: `payment-${Date.now()}-${prev.length}`,
          mode: "manual",
        },
      ]);
    }
    setComposerDraft(createEmptyAssignmentPaymentDraft("composer"));
    setComposerError(null);
    setFieldError(null);
  }

  function handleEditPayment(key: string) {
    const target = payments.find((row) => row.key === key);
    if (!target) return;
    setEditingPaymentKey(key);
    setComposerDraft({ ...target });
    setComposerError(null);
    setFieldError(null);
  }

  function handleCancelEdit() {
    setEditingPaymentKey(null);
    setComposerDraft(createEmptyAssignmentPaymentDraft("composer"));
    setComposerError(null);
    setFieldError(null);
  }

  function handleClearComposer() {
    setComposerDraft(createEmptyAssignmentPaymentDraft("composer"));
    setComposerError(null);
    setFieldError(null);
  }

  function handleRemovePayment(key: string) {
    setPayments((prev) => prev.filter((row) => row.key !== key));
    if (editingPaymentKey === key) {
      setEditingPaymentKey(null);
      setComposerDraft(createEmptyAssignmentPaymentDraft("composer"));
      setComposerError(null);
    }
    setFieldError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selfAssign && step === 1) {
      if (!hasValidDistributor) {
        setFieldError("Selecciona una distribuidora válida.");
        return;
      }
      setFieldError(null);
      setStep(2);
      return;
    }

    if (!selfAssign && step === 2 && showPayments) {
      setFieldError(null);
      setStep(3);
      return;
    }

    if (!hasValidDistributor) {
      setFieldError("Selecciona una distribuidora válida.");
      if (!selfAssign) setStep(1);
      return;
    }

    const nextPaid = selfAssign ? printer.paid : paid;
    let assignmentPayments: AssignmentPaymentPayload[] | undefined;
    if (showPayments) {
      if (editingPaymentKey !== null) {
        setFieldError(
          "Tienes un pago en edición. Guarda los cambios o cancela la edición antes de asignar.",
        );
        return;
      }
      if (hasAssignmentPaymentDetails(composerDraft)) {
        setFieldError(
          "Tienes datos de un pago sin añadir a la lista. Pulsa «Añadir a la lista» o limpia el formulario.",
        );
        return;
      }
      const parsed = assignmentPaymentsToRequest(payments);
      if (typeof parsed === "string") {
        setFieldError(parsed);
        return;
      }
      assignmentPayments = parsed;
    }
    setFieldError(null);

    const { total, countWithAmount } = sumAssignmentPaymentAmounts(payments);

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
            . Se creará una orden sin número ni monto.
          </p>
          {!selfAssign ? (
            <p className="mt-3 text-sm text-muted">
              Estado de pago registrado:{" "}
              <span className="font-medium text-card-foreground">
                {printerPaidLabel(nextPaid)}
              </span>
              {assignmentPayments && assignmentPayments.length > 0
                ? ` · ${assignmentPayments.length} pago${assignmentPayments.length === 1 ? "" : "s"}${
                    countWithAmount > 0 ? ` (${formatMoney(total)})` : ""
                  }`
                : null}
            </p>
          ) : null}
          <PrinterStatusTransition
            from="sin_asignar"
            to={nextPaid ? "asignada" : "en_consignacion"}
          />
        </>
      ),
      confirmLabel: "Asignar impresora",
      destructive: true,
    });
    if (!accepted) return;

    onSubmit({
      distributorId: parsedDistributorId,
      paid: nextPaid,
      assignmentPayments,
    });
  }

  if (selfAssign) {
    return (
      <PrinterActionDialogShell
        title="Asignar impresora"
        titleId="assign-printer-title"
        printer={printer}
        saving={saving}
        error={error}
        onClose={onClose}
        submitLabel="Asignar impresora"
        onSubmit={handleSubmit}
        submitDisabled={disabled || !hasValidDistributor}
        submitLoading={saving}
      >
        <p className="text-sm text-muted">
          La impresora quedará asignada a tu cartera. Se creará una orden sin
          número ni monto.
        </p>
      </PrinterActionDialogShell>
    );
  }

  const prevStep: AssignmentWizardStep | null =
    step === 3 ? 2 : step === 2 ? 1 : null;

  return (
    <PrinterActionDialogShell
      title="Asignar impresora"
      titleId="assign-printer-title"
      printer={printer}
      size="xl"
      saving={saving}
      error={error}
      onClose={handleClose}
      cancelLabel={prevStep == null ? "Cancelar" : "Atrás"}
      onCancel={prevStep == null ? handleClose : () => goToStep(prevStep)}
      submitLabel={resolveAssignmentSubmitLabel(step, showPayments)}
      onSubmit={(event) => void handleSubmit(event)}
      submitDisabled={
        step === 1
          ? disabled || !hasValidDistributor || distributorOptions.length === 0
          : saving || !hasValidDistributor
      }
      submitLoading={saving}
    >
      <p className="mb-2.5 shrink-0 text-xs leading-relaxed text-muted sm:mb-3.5 sm:text-sm">
        {resolveAssignmentStepSubtitle(step)}
      </p>

      <nav
        className={cn(
          "mb-3 grid shrink-0 gap-1 rounded-xl border border-border/70 bg-foreground/[0.03] p-1 sm:mb-4",
          wizardSteps.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
        aria-label="Pasos de asignación"
      >
        {wizardSteps.map(({ step: wizardStep, label }) => {
          const Icon = STEP_ICONS[wizardStep];
          const isActive = step === wizardStep;
          const isDone = step > wizardStep;
          const canNavigate = !saving && (wizardStep === 1 || hasValidDistributor);
          const tabLabel =
            wizardStep === 3 && payments.length > 0
              ? `${label} (${payments.length})`
              : label;
          return (
            <button
              key={wizardStep}
              type="button"
              disabled={!canNavigate}
              onClick={() => goToStep(wizardStep)}
              className={cn(
                "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2",
                "hover:bg-foreground/5 disabled:cursor-default disabled:opacity-50",
                isActive && "bg-card text-accent shadow-sm ring-1 ring-border/60",
                isDone && !isActive && "text-card-foreground",
                !isActive && !isDone && "text-muted",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate text-[11px] font-medium leading-tight sm:text-xs">
                {tabLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {step === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <PrinterActionPickerPanel
            label="Distribuidora"
            searchPlaceholder="Buscar distribuidora por nombre, ID o RIF…"
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
        </div>
      ) : step === 2 ? (
        <div
          className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5 sm:space-y-4"
          style={{ touchAction: "pan-y" }}
        >
          {selectedDistributorLabel ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.02] px-3.5 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Distribuidora seleccionada
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-card-foreground">
                  {selectedDistributorLabel}
                </p>
                {selectedDistributorOption?.rif ? (
                  <p className="mt-0.5 truncate font-mono text-xs text-muted">
                    RIF: {selectedDistributorOption.rif}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => goToStep(1)}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          ) : null}

          <fieldset className="space-y-3 rounded-xl border border-border p-3.5 sm:p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Estado de pago
            </legend>
            <div>
              <FieldLabel>¿La impresora ya fue pagada?</FieldLabel>
              <BooleanToggle
                value={paid}
                onChange={setPaidOverride}
                disabled={saving}
                falseLabel="No pagada"
                trueLabel="Pagada"
                ariaLabel="Estado de pago de la impresora"
              />
            </div>
            <p className="text-xs text-muted">
              {assignmentOutcomeHint(paid, payments.length)}
            </p>
          </fieldset>

          {showPayments && payments.length > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.02] px-3.5 py-3 sm:px-4">
              <p className="text-xs text-muted">
                Has añadido{" "}
                <strong className="text-card-foreground">
                  {payments.length} pago{payments.length === 1 ? "" : "s"}
                </strong>{" "}
                en la pestaña de pagos.
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => goToStep(3)}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                Ver pagos
              </button>
            </div>
          ) : null}

          {fieldError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{fieldError}</p>
          ) : null}
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5 sm:space-y-4"
          style={{ touchAction: "pan-y" }}
        >
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-foreground/[0.02] px-3.5 py-2.5 text-xs sm:px-4">
            <div className="min-w-0 flex-1 truncate text-muted">
              {selectedDistributorLabel ? (
                <>
                  <span className="font-medium text-card-foreground">
                    {selectedDistributorLabel}
                  </span>
                  {" · "}
                </>
              ) : null}
              <span>Estado: </span>
              <span className="font-medium text-card-foreground">
                {printerPaidLabel(paid)}
              </span>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => goToStep(2)}
              className="inline-flex min-h-8 shrink-0 items-center rounded-lg px-2.5 py-1 font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              Cambiar estado
            </button>
          </div>

          <AssignmentPaymentsSection
            payments={payments}
            composerDraft={composerDraft}
            editingKey={editingPaymentKey}
            disabled={saving}
            composerError={composerError}
            onComposerChange={(next) => {
              setComposerDraft(next);
              setComposerError(null);
              setFieldError(null);
            }}
            onAddOrSavePayment={handleAddOrSavePayment}
            onEditPayment={handleEditPayment}
            onCancelEdit={handleCancelEdit}
            onClearComposer={handleClearComposer}
            onRemovePayment={handleRemovePayment}
          />

          {fieldError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{fieldError}</p>
          ) : null}
        </div>
      )}
    </PrinterActionDialogShell>
  );
}
