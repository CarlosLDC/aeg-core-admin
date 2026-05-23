"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { ContractDocumentUpload } from "@/components/contracts/contract-document-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { type ContractFormValues } from "@/lib/contract-form";
import type { ContractKind } from "@/types/contract";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";
type PartyOption = { id: number; label: string };

type ContractFormDialogProps = {
  kind: ContractKind;
  mode: "create" | "edit";
  contract?: DistributorContractResponse | ServiceCenterContractResponse;
  partyOptions: PartyOption[];
  catalogLoading: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ContractFormValues) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

const emptyForm: ContractFormValues = {
  partyId: "",
  startDate: "",
  endDate: "",
  photoUrls: [],
};

function partyIdFromContract(
  kind: ContractKind,
  contract: DistributorContractResponse | ServiceCenterContractResponse,
): string {
  if (kind === "distributor") {
    return String((contract as DistributorContractResponse).distributorId);
  }
  return String((contract as ServiceCenterContractResponse).serviceCenterId);
}

export function ContractFormDialog({
  kind,
  mode,
  contract,
  partyOptions,
  catalogLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
  onDelete,
  deleting = false,
}: ContractFormDialogProps) {
  const [form, setForm] = useState<ContractFormValues>(emptyForm);

  const partyLabel =
    kind === "distributor" ? "Distribuidora" : "Centro de servicio";

  const partySelectOptions = useMemo(
    () =>
      partyOptions.map((opt) => ({
        value: String(opt.id),
        label: opt.label,
      })),
    [partyOptions],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && contract) {
      setForm({
        partyId: partyIdFromContract(kind, contract),
        startDate: contract.startDate.slice(0, 10),
        endDate: contract.endDate.slice(0, 10),
        photoUrls: [...(contract.photoUrls ?? [])],
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, contract, kind]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl sm:max-w-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nuevo contrato" : "Editar contrato"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Contrato de {partyLabel.toLowerCase()}: vigencia y documentos
              adjuntos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <FieldLabel required>{partyLabel}</FieldLabel>
            <SearchableSelect
              value={form.partyId}
              onChange={(partyId) => setForm((f) => ({ ...f, partyId }))}
              options={partySelectOptions}
              loading={catalogLoading}
              disabled={catalogLoading || partyOptions.length === 0}
              required
              emptyLabel={
                partyOptions.length === 0
                  ? "No hay registros disponibles"
                  : "Seleccionar…"
              }
              searchPlaceholder={
                kind === "distributor"
                  ? "Buscar distribuidora o sucursal…"
                  : "Buscar centro de servicio o sucursal…"
              }
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>Inicio</FieldLabel>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel required>Fin</FieldLabel>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <FieldLabel>Documentos</FieldLabel>
            <ContractDocumentUpload
              kind={kind}
              urls={form.photoUrls}
              onChange={(photoUrls) => setForm((f) => ({ ...f, photoUrls }))}
              disabled={saving || catalogLoading}
            />
          </div>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            deleting={deleting}
            submitDisabled={
              catalogLoading ||
              !form.partyId ||
              !form.startDate ||
              !form.endDate ||
              form.photoUrls.length === 0
            }
            onClose={onClose}
            onDelete={onDelete}
          />
        </form>
      </div>
    </div>
  );
}
