"use client";

import { ContractDocumentUpload } from "@/components/contracts/contract-document-upload";
import { FieldLabel } from "@/components/ui/field-label";
import type {
  BranchWizardContractDraft,
  BranchWizardValues,
} from "@/components/branches/branch-wizard-types";
import type { ContractKind } from "@/types/contract";

type BranchWizardContractFieldsProps = {
  form: BranchWizardValues;
  setForm: React.Dispatch<React.SetStateAction<BranchWizardValues>>;
  saving: boolean;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:opacity-60";

function ContractBlock({
  title,
  description,
  kind,
  draft,
  onChange,
  saving,
}: {
  title: string;
  description: string;
  kind: ContractKind;
  draft: BranchWizardContractDraft;
  onChange: (patch: Partial<BranchWizardContractDraft>) => void;
  saving: boolean;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-foreground/[0.02] p-4">
      <legend className="text-sm font-semibold text-card-foreground">
        {title}
      </legend>
      <p className="text-xs text-muted">{description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel required>Inicio</FieldLabel>
          <input
            type="date"
            required
            value={draft.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            disabled={saving}
            className={inputClass}
          />
        </label>
        <label className="block">
          <FieldLabel required>Fin</FieldLabel>
          <input
            type="date"
            required
            value={draft.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            disabled={saving}
            className={inputClass}
          />
        </label>
      </div>
      <div>
        <FieldLabel required>Documentos</FieldLabel>
        <ContractDocumentUpload
          kind={kind}
          urls={draft.photoUrls}
          onChange={(photoUrls) => onChange({ photoUrls })}
          disabled={saving}
        />
      </div>
    </fieldset>
  );
}

export function BranchWizardContractFields({
  form,
  setForm,
  saving,
}: BranchWizardContractFieldsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Sube el primer contrato de cada rol seleccionado. Se vinculará
        automáticamente a la entidad que se creará con esta sucursal.
      </p>
      {form.isDistributor ? (
        <ContractBlock
          title="Contrato de distribuidora"
          description="Vigencia y documentos del contrato con la nueva distribuidora."
          kind="distributor"
          draft={form.distributorContract}
          onChange={(patch) =>
            setForm((f) => ({
              ...f,
              distributorContract: { ...f.distributorContract, ...patch },
            }))
          }
          saving={saving}
        />
      ) : null}
      {form.isServiceCenter ? (
        <ContractBlock
          title="Contrato de centro de servicio"
          description="Vigencia y documentos del contrato con el nuevo centro de servicio."
          kind="serviceCenter"
          draft={form.serviceCenterContract}
          onChange={(patch) =>
            setForm((f) => ({
              ...f,
              serviceCenterContract: { ...f.serviceCenterContract, ...patch },
            }))
          }
          saving={saving}
        />
      ) : null}
    </div>
  );
}
