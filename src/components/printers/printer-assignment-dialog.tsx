"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { CommercialInvoiceCollectionStatusBadge } from "@/components/commercial-invoices/commercial-invoice-badges";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import {
  SearchableSelect,
  matchesSearch,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  formatCommercialInvoiceTitle,
} from "@/lib/commercial-invoice-form";
import { fetchCommercialInvoices } from "@/lib/commercial-invoices-api";
import { can } from "@/lib/permissions/can";
import { printerPaidLabel } from "@/lib/printer-form";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
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
  const titleId = useId();
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
  const showCommercialInvoicePicker = !selfAssign && canReadCommercialInvoices;

  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(
    showCommercialInvoicePicker,
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    printer.facturaComercialId != null
      ? String(printer.facturaComercialId)
      : "",
  );

  useEffect(() => {
    if (!showCommercialInvoicePicker) {
      return;
    }
    let active = true;
    fetchCommercialInvoices()
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
    return () => {
      active = false;
    };
  }, [showCommercialInvoicePicker]);

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

  const selectedDistributorOption = useMemo(() => {
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return distributorOptions.find((opt) => opt.id === id) ?? null;
  }, [distributorId, distributorOptions]);
  const selectedDistributorLabel = selectedDistributorOption?.label ?? null;

  const invoiceOptions: SearchableSelectOption[] = useMemo(() => {
    const distRif = selectedDistributorOption?.rif?.trim().toUpperCase() ?? "";
    const sorted = [...invoices].sort((a, b) => {
      const aLinked = a.id === printer.facturaComercialId ? 0 : 1;
      const bLinked = b.id === printer.facturaComercialId ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;

      if (distRif) {
        const aMatch =
          (a.empresaRif ?? "").trim().toUpperCase() === distRif ? 0 : 1;
        const bMatch =
          (b.empresaRif ?? "").trim().toUpperCase() === distRif ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });

    return sorted.map((inv) => {
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
    });
  }, [invoices, printer.facturaComercialId, selectedDistributorOption?.rif]);

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

  const disabled = saving || catalogLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);

    const nextPaid = selfAssign ? printer.paid : paid;
    const parsedInvoiceId = Number(selectedInvoiceId);
    const facturaComercialId =
      showCommercialInvoicePicker &&
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
          {selectedInvoice ? (
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

    onSubmit({ distributorId: id, paid: nextPaid, facturaComercialId });
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
          <div className="mt-4">
            <FieldLabel>¿La impresora ya fue pagada?</FieldLabel>
            <BooleanToggle
              value={paid}
              onChange={setPaidOverride}
              disabled={disabled}
              falseLabel="No pagada"
              trueLabel="Pagada"
              ariaLabel="Estado de pago de la impresora"
            />
          </div>
          {showCommercialInvoicePicker ? (
            <div className="mt-4">
              <FieldLabel>Factura comercial (opcional)</FieldLabel>
              <SearchableSelect
                value={selectedInvoiceId}
                onChange={setSelectedInvoiceId}
                options={invoiceOptions}
                disabled={disabled || invoicesLoading}
                loading={invoicesLoading}
                emptyLabel="Sin factura comercial (vincular después)"
                searchPlaceholder="Buscar por N° factura, empresa o RIF…"
                modalTitle="Factura comercial (opcional)"
                preloadOptions
                mono
              />
            </div>
          ) : null}
        </>
      )}
    </PrinterActionDialogShell>
  );
}
