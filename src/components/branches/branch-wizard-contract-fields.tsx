"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContractDocumentUpload } from "@/components/contracts/contract-document-upload";
import { FieldLabel } from "@/components/ui/field-label";
import type {
  BranchWizardContractDraft,
  BranchWizardValues,
} from "@/components/branches/branch-wizard-types";
import type { ContractKind } from "@/types/contract";
import { cn } from "@/lib/utils";

type BranchWizardContractFieldsProps = {
  form: BranchWizardValues;
  setForm: React.Dispatch<React.SetStateAction<BranchWizardValues>>;
  saving: boolean;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:opacity-60";

type ContractStepMeta = {
  id: "distributor" | "serviceCenter";
  title: string;
  description: string;
  kind: ContractKind;
};

function ContractBlock({
  title,
  description,
  kind,
  draft,
  onChange,
  saving,
  showHeader = true,
}: {
  title: string;
  description: string;
  kind: ContractKind;
  draft: BranchWizardContractDraft;
  onChange: (patch: Partial<BranchWizardContractDraft>) => void;
  saving: boolean;
  showHeader?: boolean;
}) {
  return (
    <fieldset
      className={cn(
        "space-y-3 rounded-lg border border-border bg-foreground/[0.02]",
        showHeader ? "p-3" : "border-0 bg-transparent p-0",
      )}
    >
      {showHeader ? (
        <>
          <legend className="text-sm font-semibold text-card-foreground">
            {title}
          </legend>
          <p className="text-xs text-muted">{description}</p>
        </>
      ) : (
        <p className="sr-only">{title}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
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
  const steps = useMemo((): ContractStepMeta[] => {
    const list: ContractStepMeta[] = [];
    if (form.isDistributor) {
      list.push({
        id: "distributor",
        title: "Contrato de distribuidora",
        description:
          "Vigencia y documentos del contrato con la nueva distribuidora.",
        kind: "distributor",
      });
    }
    if (form.isServiceCenter) {
      list.push({
        id: "serviceCenter",
        title: "Contrato de centro de servicio",
        description:
          "Vigencia y documentos del contrato con el nuevo centro de servicio.",
        kind: "serviceCenter",
      });
    }
    return list;
  }, [form.isDistributor, form.isServiceCenter]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [steps.length, form.isDistributor, form.isServiceCenter]);

  const stepCount = steps.length;
  const safeIndex =
    stepCount === 0 ? 0 : Math.min(index, stepCount - 1);
  const showNav = stepCount > 1;
  const current = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === stepCount - 1;

  useEffect(() => {
    if (!showNav) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        setIndex((i) => i - 1);
      }
      if (e.key === "ArrowRight" && !isLast) {
        e.preventDefault();
        setIndex((i) => i + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFirst, isLast, showNav]);

  if (!current) return null;

  const draft =
    current.id === "distributor"
      ? form.distributorContract
      : form.serviceCenterContract;
  const onChange = (patch: Partial<BranchWizardContractDraft>) => {
    if (current.id === "distributor") {
      setForm((f) => ({
        ...f,
        distributorContract: { ...f.distributorContract, ...patch },
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      serviceCenterContract: { ...f.serviceCenterContract, ...patch },
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Sube el primer contrato de cada rol seleccionado. Se vinculará
        automáticamente a la entidad que se creará con esta sucursal.
      </p>

      {showNav ? (
        <div
          className="flex items-center gap-1 rounded-lg border border-border bg-foreground/[0.02] px-1 py-1"
          role="group"
          aria-label="Tipo de contrato"
        >
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={isFirst || saving}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Contrato anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {current.title}
            </p>
            <p className="text-xs text-muted">
              {safeIndex + 1} de {stepCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            disabled={isLast || saving}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Contrato siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      {!showNav ? (
        <p className="text-xs text-muted">{current.description}</p>
      ) : null}

      <ContractBlock
        key={current.id}
        title={current.title}
        description={current.description}
        kind={current.kind}
        draft={draft}
        onChange={onChange}
        saving={saving}
        showHeader={!showNav}
      />
    </div>
  );
}
