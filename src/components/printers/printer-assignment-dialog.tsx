"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Building2, ReceiptText } from "lucide-react";
import { CommercialInvoiceCollectionStatusBadge } from "@/components/commercial-invoices/commercial-invoice-badges";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SearchableSelect,
  matchesSearch,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  formatCommercialInvoiceTitle,
  toCommercialInvoiceRequest,
} from "@/lib/commercial-invoice-form";
import {
  createCommercialInvoice,
  fetchCommercialInvoices,
  getCommercialInvoicesErrorMessage,
} from "@/lib/commercial-invoices-api";
import { fetchCompanies } from "@/lib/companies-api";
import { zodFieldErrors } from "@/lib/form-zod";
import { can } from "@/lib/permissions/can";
import {
  defaultAssignmentNewInvoiceForm,
  getAssignmentWizardSteps,
  resolveAssignmentStepSubtitle,
  resolveAssignmentSubmitLabel,
  resolveCompanyIdForDistributorRif,
  sortCommercialInvoicesForAssignment,
  syncNewInvoiceDefaultsForPaid,
  type AssignmentInvoiceMode,
  type AssignmentWizardStep,
} from "@/lib/printer-assignment-wizard";
import { printerPaidLabel } from "@/lib/printer-form";
import { commercialInvoiceFormSchema } from "@/lib/schemas/commercial-invoice-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceRequest,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type { CompanyResponse } from "@/types/company";
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
    facturaComercialId?: number | null;
  }) => void;
};

const STEP_ICONS = {
  1: Building2,
  2: ReceiptText,
} as const;

function resolveDefaultDistributorId(
  printer: PrinterResponse,
  distributorOptions: SelectOption[],
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
  const toast = useToast();
  const titleId = useId();

  const [step, setStep] = useState<AssignmentWizardStep>(1);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [distributorOverride, setDistributorOverride] = useState<string | null>(
    null,
  );
  const [distributorQuery, setDistributorQuery] = useState("");
  const [paidOverride, setPaidOverride] = useState<boolean | null>(null);
  const paid = paidOverride ?? printer.paid;

  const selfAssign =
    lockDistributor && defaultDistributorId != null && defaultDistributorId > 0;
  const canReadCommercialInvoices = user
    ? can(user.role, "commercialInvoices", "read")
    : false;
  const canCreateCommercialInvoices = user
    ? can(user.role, "commercialInvoices", "create")
    : false;
  const showCommercialInvoicePicker = !selfAssign && canReadCommercialInvoices;

  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(
    showCommercialInvoicePicker,
  );
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(
    showCommercialInvoicePicker && canCreateCommercialInvoices,
  );
  const [companiesCatalogError, setCompaniesCatalogError] = useState<
    string | null
  >(null);

  const [invoiceMode, setInvoiceMode] =
    useState<AssignmentInvoiceMode>("existing");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    printer.facturaComercialId != null
      ? String(printer.facturaComercialId)
      : "",
  );
  const [newInvoice, setNewInvoice] = useState<CommercialInvoiceFormValues>(
    () => defaultAssignmentNewInvoiceForm(printer.paid),
  );
  const [empresaIdOverride, setEmpresaIdOverride] = useState<string | null>(
    null,
  );
  const [newInvoiceTouched, setNewInvoiceTouched] = useState({
    modalidad: false,
    estadoCobro: false,
  });
  const [newInvoiceFieldErrors, setNewInvoiceFieldErrors] = useState<
    Partial<Record<keyof CommercialInvoiceFormValues, string>>
  >({});
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceCreateError, setInvoiceCreateError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!showCommercialInvoicePicker) {
      return;
    }
    let active = true;

    const invoicesPromise = fetchCommercialInvoices()
      .then((list) => {
        if (!active) return;
        setInvoices(list);
      })
      .catch(() => {
        if (!active) return;
        setInvoices([]);
      })
      .finally(() => {
        if (active) setInvoicesLoading(false);
      });

    const companiesPromise = canCreateCommercialInvoices
      ? fetchCompanies()
          .then((list) => {
            if (!active) return;
            setCompanies(list);
            setCompaniesCatalogError(null);
          })
          .catch((err) => {
            if (!active) return;
            setCompanies([]);
            setCompaniesCatalogError(getCommercialInvoicesErrorMessage(err));
          })
          .finally(() => {
            if (active) setCompaniesLoading(false);
          })
      : Promise.resolve();

    void Promise.all([invoicesPromise, companiesPromise]);

    return () => {
      active = false;
    };
  }, [showCommercialInvoicePicker, canCreateCommercialInvoices]);

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

  const defaultNewInvoiceEmpresaId = useMemo(
    () =>
      resolveCompanyIdForDistributorRif(
        selectedDistributorOption?.rif,
        companies,
      ),
    [selectedDistributorOption?.rif, companies],
  );
  const effectiveNewInvoiceEmpresaId =
    empresaIdOverride ?? defaultNewInvoiceEmpresaId;

  const sortedInvoices = useMemo(
    () =>
      sortCommercialInvoicesForAssignment(
        invoices,
        printer.facturaComercialId,
        selectedDistributorOption?.rif,
      ),
    [invoices, printer.facturaComercialId, selectedDistributorOption?.rif],
  );

  const invoiceOptions: SearchableSelectOption[] = useMemo(
    () =>
      sortedInvoices.map((inv) => {
        const companyName = inv.empresaNombre ?? inv.clienteComercialNombre;
        const countLabel = `${inv.printerCount} ${inv.printerCount === 1 ? "impresora" : "impresoras"}`;
        return {
          value: String(inv.id),
          label: formatCommercialInvoiceTitle(inv),
          description: [
            companyName,
            COMMERCIAL_INVOICE_MODALITY_LABELS[inv.modalidad] ?? inv.modalidad,
            countLabel,
          ]
            .filter(Boolean)
            .join(" · "),
          badge: (
            <CommercialInvoiceCollectionStatusBadge status={inv.estadoCobro} />
          ),
          searchText: [
            String(inv.id),
            inv.numeroFactura,
            inv.empresaNombre,
            inv.empresaRif,
            inv.clienteComercialNombre,
            COMMERCIAL_INVOICE_MODALITY_LABELS[inv.modalidad],
            COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[inv.estadoCobro],
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [sortedInvoices],
  );

  const companyOptions: SearchableSelectOption[] = useMemo(
    () =>
      companies
        .map((c) => {
          const label = c.businessName?.trim() || c.rif;
          return {
            value: String(c.id),
            label,
            description: c.rif ? `RIF: ${c.rif}` : undefined,
            searchText: [String(c.id), c.businessName, c.rif]
              .filter(Boolean)
              .join(" "),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [companies],
  );

  const selectedInvoice = useMemo(() => {
    const id = Number(selectedInvoiceId);
    if (!Number.isInteger(id) || id <= 0) return null;
    return invoices.find((inv) => inv.id === id) ?? null;
  }, [invoices, selectedInvoiceId]);

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

  const busy = saving || creatingInvoice;
  const disabled = busy || catalogLoading;
  const wizardSteps = useMemo(
    () => getAssignmentWizardSteps(showCommercialInvoicePicker),
    [showCommercialInvoicePicker],
  );

  function goToStep(target: AssignmentWizardStep) {
    if (busy) return;
    if (target === 2 && !hasValidDistributor) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);
    setInvoiceCreateError(null);
    setStep(target);
  }

  function handlePaidChange(nextPaid: boolean) {
    setPaidOverride(nextPaid);
    setNewInvoice((prev) =>
      syncNewInvoiceDefaultsForPaid(prev, nextPaid, newInvoiceTouched),
    );
  }

  function handleClose() {
    if (busy) return;
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selfAssign && step === 1) {
      if (!hasValidDistributor) {
        setFieldError("Selecciona una distribuidora válida.");
        return;
      }
      setFieldError(null);
      setInvoiceCreateError(null);
      setStep(2);
      return;
    }

    if (!hasValidDistributor) {
      setFieldError("Selecciona una distribuidora válida.");
      if (!selfAssign) setStep(1);
      return;
    }
    setFieldError(null);
    setInvoiceCreateError(null);

    const nextPaid = selfAssign ? printer.paid : paid;
    const isCreatingNewInvoice =
      showCommercialInvoicePicker &&
      canCreateCommercialInvoices &&
      invoiceMode === "new";

    let newInvoiceRequest: CommercialInvoiceRequest | null = null;
    if (isCreatingNewInvoice) {
      const effectiveNewInvoice: CommercialInvoiceFormValues = {
        ...newInvoice,
        empresaId: effectiveNewInvoiceEmpresaId,
      };
      const parsed = commercialInvoiceFormSchema.safeParse(effectiveNewInvoice);
      const errors = zodFieldErrors(parsed);
      if (errors) {
        setNewInvoiceFieldErrors(errors);
        return;
      }
      const reqOrError = toCommercialInvoiceRequest(effectiveNewInvoice);
      if (typeof reqOrError === "string") {
        setInvoiceCreateError(reqOrError);
        return;
      }
      setNewInvoiceFieldErrors({});
      newInvoiceRequest = reqOrError;
    }

    const parsedInvoiceId = Number(selectedInvoiceId);
    let facturaComercialId: number | null =
      showCommercialInvoicePicker &&
      !isCreatingNewInvoice &&
      selectedInvoiceId.trim() &&
      Number.isInteger(parsedInvoiceId) &&
      parsedInvoiceId > 0
        ? parsedInvoiceId
        : null;

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
          {!selfAssign ? (
            <p className="mt-3 text-sm text-muted">
              Estado de pago registrado:{" "}
              <span className="font-medium text-card-foreground">
                {printerPaidLabel(nextPaid)}
              </span>
            </p>
          ) : null}
          {isCreatingNewInvoice ? (
            <p className="mt-1.5 text-sm text-muted">
              Nueva factura comercial:{" "}
              <span className="font-mono font-medium text-card-foreground">
                {newInvoice.numeroFactura.trim()}
              </span>{" "}
              (
              {COMMERCIAL_INVOICE_MODALITY_LABELS[newInvoice.modalidad] ??
                newInvoice.modalidad}{" "}
              ·{" "}
              {COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[
                newInvoice.estadoCobro
              ] ?? newInvoice.estadoCobro}
              )
            </p>
          ) : selectedInvoice ? (
            <p className="mt-1.5 text-sm text-muted">
              Factura comercial:{" "}
              <span className="font-mono font-medium text-card-foreground">
                {formatCommercialInvoiceTitle(selectedInvoice)}
              </span>
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

    if (isCreatingNewInvoice && newInvoiceRequest) {
      setCreatingInvoice(true);
      setInvoiceCreateError(null);
      try {
        const created = await createCommercialInvoice(newInvoiceRequest);
        setInvoices((prev) => [created, ...prev]);
        setSelectedInvoiceId(String(created.id));
        setInvoiceMode("existing");
        facturaComercialId = created.id;
        toast.success(
          `Factura comercial ${formatCommercialInvoiceTitle(created)} creada.`,
        );
      } catch (err) {
        const message = getCommercialInvoicesErrorMessage(err);
        setInvoiceCreateError(message);
        toast.error(message);
        return;
      } finally {
        setCreatingInvoice(false);
      }
    }

    onSubmit({
      distributorId: parsedDistributorId,
      paid: nextPaid,
      facturaComercialId,
    });
  }

  if (selfAssign) {
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
        submitDisabled={disabled || !hasValidDistributor}
        submitLoading={saving}
      >
        <p className="text-sm text-muted">
          La impresora quedará asignada a tu cartera con estatus{" "}
          <span className="font-medium text-card-foreground">Asignada</span>.
        </p>
      </PrinterActionDialogShell>
    );
  }

  const displayError =
    error ||
    invoiceCreateError ||
    (step === 2 && invoiceMode === "new" ? companiesCatalogError : null);

  const step2SubmitDisabled =
    busy ||
    !hasValidDistributor ||
    (showCommercialInvoicePicker &&
      canCreateCommercialInvoices &&
      invoiceMode === "new" &&
      (!newInvoice.numeroFactura.trim() ||
        !effectiveNewInvoiceEmpresaId.trim()));

  return (
    <PrinterActionDialogShell
      title="Asignar impresora"
      titleId={titleId}
      printer={printer}
      size="lg"
      saving={busy}
      error={displayError}
      onClose={handleClose}
      cancelLabel={step === 1 ? "Cancelar" : "Atrás"}
      onCancel={step === 1 ? handleClose : () => goToStep(1)}
      submitLabel={resolveAssignmentSubmitLabel(step)}
      onSubmit={(e) => void handleSubmit(e)}
      submitDisabled={
        step === 1
          ? disabled || !hasValidDistributor || distributorOptions.length === 0
          : step2SubmitDisabled
      }
      submitLoading={busy}
    >
      <p className="mb-4 shrink-0 text-sm text-muted">
        {resolveAssignmentStepSubtitle(step, showCommercialInvoicePicker)}
      </p>

      <nav
        className="mb-4 flex shrink-0 gap-1"
        aria-label="Pasos de asignación"
      >
        {wizardSteps.map(({ step: s, label }) => {
          const Icon = STEP_ICONS[s];
          const isActive = step === s;
          const isDone = step > s;
          const canNavigate = !busy && (s === 1 || hasValidDistributor);
          return (
            <button
              key={s}
              type="button"
              disabled={!canNavigate}
              onClick={() => goToStep(s)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                "hover:bg-foreground/5 disabled:cursor-default disabled:opacity-50",
                isActive && "bg-accent/10 text-accent",
                isDone && !isActive && "text-card-foreground",
                !isActive && !isDone && "text-muted",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="text-[11px] font-medium leading-tight sm:text-xs">
                {label}
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
      ) : (
        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5"
          style={{ touchAction: "pan-y" }}
        >
          {selectedDistributorLabel ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
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
                disabled={busy}
                onClick={() => goToStep(1)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          ) : null}

          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Estado de pago
            </legend>

            <div>
              <FieldLabel>¿La impresora ya fue pagada?</FieldLabel>
              <BooleanToggle
                value={paid}
                onChange={handlePaidChange}
                disabled={busy}
                falseLabel="No pagada"
                trueLabel="Pagada"
                ariaLabel="Estado de pago de la impresora"
              />
            </div>

            <p className="text-xs text-muted">
              {paid
                ? "La impresora quedará en estatus Asignada."
                : "La impresora quedará en estatus En consignación."}
            </p>
          </fieldset>

          {showCommercialInvoicePicker ? (
            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Factura comercial (opcional)
              </legend>

              {canCreateCommercialInvoices ? (
                <SegmentedToggle
                  value={invoiceMode}
                  onChange={(mode) => {
                    setInvoiceMode(mode);
                    setInvoiceCreateError(null);
                    setNewInvoiceFieldErrors({});
                  }}
                  disabled={busy}
                  ariaLabel="Origen de la factura comercial"
                  options={[
                    { value: "existing", label: "Seleccionar existente" },
                    { value: "new", label: "Crear nueva" },
                  ]}
                />
              ) : null}

              {invoiceMode === "existing" || !canCreateCommercialInvoices ? (
                <div className="space-y-2.5">
                  <div className="block">
                    <FieldLabel>Factura comercial</FieldLabel>
                    <SearchableSelect
                      value={selectedInvoiceId}
                      onChange={(value) => {
                        setSelectedInvoiceId(value);
                        setInvoiceCreateError(null);
                      }}
                      options={invoiceOptions}
                      disabled={busy || invoicesLoading}
                      loading={invoicesLoading}
                      emptyLabel="Sin factura comercial (vincular después)"
                      searchPlaceholder="Buscar por N° factura, empresa o RIF…"
                      modalTitle="Factura comercial (opcional)"
                      preloadOptions
                      mono
                    />
                  </div>

                  {!invoicesLoading &&
                  invoices.length === 0 &&
                  canCreateCommercialInvoices ? (
                    <div className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5 text-xs text-muted">
                      <p>No hay facturas comerciales registradas aún.</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setInvoiceMode("new");
                          setInvoiceCreateError(null);
                          setNewInvoiceFieldErrors({});
                        }}
                        className="mt-1.5 font-medium text-accent hover:underline disabled:opacity-50"
                      >
                        Crear nueva factura comercial →
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel required>Número de factura</FieldLabel>
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={newInvoice.numeroFactura}
                        disabled={busy}
                        onChange={(e) => {
                          setNewInvoice((prev) => ({
                            ...prev,
                            numeroFactura: e.target.value,
                          }));
                          setNewInvoiceFieldErrors((prev) => ({
                            ...prev,
                            numeroFactura: undefined,
                          }));
                          setInvoiceCreateError(null);
                        }}
                        className={cn(formFieldInputClass, "font-mono")}
                        placeholder="FAC-000123"
                      />
                      {newInvoiceFieldErrors.numeroFactura ? (
                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                          {newInvoiceFieldErrors.numeroFactura}
                        </span>
                      ) : null}
                    </label>

                    <div className="block">
                      <FieldLabel required>Empresa</FieldLabel>
                      <SearchableSelect
                        required
                        value={effectiveNewInvoiceEmpresaId}
                        onChange={(empresaId) => {
                          setEmpresaIdOverride(empresaId);
                          setNewInvoiceFieldErrors((prev) => ({
                            ...prev,
                            empresaId: undefined,
                          }));
                          setInvoiceCreateError(null);
                        }}
                        options={companyOptions}
                        disabled={busy || companiesLoading}
                        loading={companiesLoading}
                        emptyLabel="Seleccionar empresa…"
                        searchPlaceholder="Buscar empresa o RIF…"
                        modalTitle="Seleccionar empresa"
                        preloadOptions
                      />
                      {newInvoiceFieldErrors.empresaId ? (
                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                          {newInvoiceFieldErrors.empresaId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-3">
                    <label className="block">
                      <FieldLabel required>Modalidad</FieldLabel>
                      <NativeSelect
                        required
                        value={newInvoice.modalidad}
                        disabled={busy}
                        onChange={(e) => {
                          setNewInvoiceTouched((prev) => ({
                            ...prev,
                            modalidad: true,
                          }));
                          setNewInvoice((prev) => ({
                            ...prev,
                            modalidad: e.target
                              .value as CommercialInvoiceFormValues["modalidad"],
                          }));
                          setNewInvoiceFieldErrors((prev) => ({
                            ...prev,
                            modalidad: undefined,
                          }));
                          setInvoiceCreateError(null);
                        }}
                      >
                        {COMMERCIAL_INVOICE_MODALITIES.map((modality) => (
                          <option key={modality} value={modality}>
                            {COMMERCIAL_INVOICE_MODALITY_LABELS[modality]}
                          </option>
                        ))}
                      </NativeSelect>
                      {newInvoiceFieldErrors.modalidad ? (
                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                          {newInvoiceFieldErrors.modalidad}
                        </span>
                      ) : null}
                    </label>

                    <label className="block">
                      <FieldLabel required>Estado de cobro</FieldLabel>
                      <NativeSelect
                        required
                        value={newInvoice.estadoCobro}
                        disabled={busy}
                        onChange={(e) => {
                          setNewInvoiceTouched((prev) => ({
                            ...prev,
                            estadoCobro: true,
                          }));
                          setNewInvoice((prev) => ({
                            ...prev,
                            estadoCobro: e.target
                              .value as CommercialInvoiceFormValues["estadoCobro"],
                          }));
                          setNewInvoiceFieldErrors((prev) => ({
                            ...prev,
                            estadoCobro: undefined,
                          }));
                          setInvoiceCreateError(null);
                        }}
                      >
                        {COMMERCIAL_INVOICE_COLLECTION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </NativeSelect>
                      {newInvoiceFieldErrors.estadoCobro ? (
                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                          {newInvoiceFieldErrors.estadoCobro}
                        </span>
                      ) : null}
                    </label>

                    <label className="block">
                      <FieldLabel>Monto total (opcional)</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={newInvoice.montoTotal}
                        disabled={busy}
                        onChange={(e) => {
                          setNewInvoice((prev) => ({
                            ...prev,
                            montoTotal: e.target.value,
                          }));
                          setNewInvoiceFieldErrors((prev) => ({
                            ...prev,
                            montoTotal: undefined,
                          }));
                          setInvoiceCreateError(null);
                        }}
                        className={cn(formFieldInputClass, "font-mono")}
                        placeholder="Ej. 900.00"
                      />
                      {newInvoiceFieldErrors.montoTotal ? (
                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                          {newInvoiceFieldErrors.montoTotal}
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <p className="text-xs text-muted">
                    Se creará la factura comercial y se vinculará
                    automáticamente al confirmar la asignación.
                  </p>
                </div>
              )}
            </fieldset>
          ) : null}
        </div>
      )}
    </PrinterActionDialogShell>
  );
}
