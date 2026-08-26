"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { TruncatedText } from "@/components/ui/truncated-text";
import { distributorLabel } from "@/lib/branch-roles";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type ClientTransferDialogProps = {
  open: boolean;
  client: ClientResponse | null;
  distributors: DistributorResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (targetDistributorId: number) => void;
};

function clientBusinessName(client: ClientResponse): string {
  return (
    client.companyBusinessName?.trim() ||
    client.companyRif?.trim() ||
    `Cliente #${client.id}`
  );
}

function clientRif(client: ClientResponse): string {
  return client.companyRif?.trim() || "—";
}

export function ClientTransferDialog({
  open,
  client,
  distributors,
  branches,
  companies,
  saving,
  error,
  onClose,
  onSubmit,
}: ClientTransferDialogProps) {
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (!open) return;
    setTargetId("");
  }, [open, client?.id]);

  if (!open || !client) return null;

  const currentDistributor = client.distributorId
    ? distributors.find((d) => d.id === client.distributorId)
    : undefined;
  const currentLabel = !client.distributorId
    ? "Sin distribuidor"
    : currentDistributor
      ? distributorLabel(currentDistributor, branches, companies)
      : "Distribuidor desconocido";

  const eligibleDistributors = distributors.filter(
    (d) => d.id !== client.distributorId,
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(targetId);
    if (!Number.isFinite(id)) return;
    onSubmit(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-transfer-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={saving}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-xl sm:max-h-[90vh] sm:rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id="client-transfer-dialog-title"
              className="text-lg font-semibold text-card-foreground"
            >
              Transferir cliente
            </h2>
            <p className="mt-1 text-sm text-muted">
              Reasigna la distribuidora del cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          ) : null}

          <dl className="mb-4 space-y-3 rounded-xl border border-border p-3 text-sm sm:p-4">
            <div className="min-w-0 space-y-0.5">
              <dt className="text-xs text-muted">Cliente</dt>
              <dd className="font-medium text-card-foreground">
                <TruncatedText maxClassName="max-w-full">
                  {clientBusinessName(client)}
                </TruncatedText>
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-xs text-muted">RIF</dt>
              <dd className="font-mono text-card-foreground">
                {clientRif(client)}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-xs text-muted">Distribuidora actual</dt>
              <dd className="text-card-foreground">
                <TruncatedText maxClassName="max-w-full">
                  {currentLabel}
                </TruncatedText>
              </dd>
            </div>
          </dl>

          <form
            id="client-transfer-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <label className="block min-w-0">
              <FieldLabel required>Nueva distribuidora</FieldLabel>
              <DistributorSelect
                value={targetId}
                onChange={setTargetId}
                distributors={eligibleDistributors}
                branches={branches}
                companies={companies}
                disabled={saving}
                excludeBranchId={client.branchId}
                emptyLabel="Seleccionar distribuidora…"
                searchPlaceholder="Buscar distribuidora…"
                modalTitle="Nueva distribuidora"
              />
            </label>

            <p className="text-sm text-muted">
              Las impresoras del cliente conservan su distribuidora actual; solo
              cambia la relación cliente–distribuidor.
            </p>
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
          <FormDialogFooter
            mode="edit"
            saving={saving}
            saveLabel="Transferir"
            submitDisabled={!targetId.trim()}
            onClose={onClose}
            formId="client-transfer-form"
          />
        </div>
      </div>
    </div>
  );
}
