"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import {
  formatContractDate,
  pickCurrentContract,
} from "@/lib/contract-form";
import {
  contractDocumentLabel,
  contractDocumentViewUrl,
  isPdfUrl,
} from "@/lib/contract-documents";
import {
  fetchDistributorContracts,
  getDistributorContractsErrorMessage,
} from "@/lib/distributor-contracts-api";
import {
  fetchServiceCenterContracts,
  getServiceCenterContractsErrorMessage,
} from "@/lib/service-center-contracts-api";
import type { BranchWithRoles } from "@/types/branch";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";

type ContractSlice = {
  kind: "distributor" | "serviceCenter";
  title: string;
  contract: DistributorContractResponse | ServiceCenterContractResponse | null;
  error: string | null;
  loading: boolean;
};

type BranchContractDownloadModalProps = {
  open: boolean;
  branch: BranchWithRoles;
  companyLabel: string;
  onClose: () => void;
};

export function BranchContractDownloadModal({
  open,
  branch,
  companyLabel,
  onClose,
}: BranchContractDownloadModalProps) {
  const [distributorSlice, setDistributorSlice] = useState<ContractSlice | null>(
    null,
  );
  const [serviceCenterSlice, setServiceCenterSlice] =
    useState<ContractSlice | null>(null);

  const load = useCallback(async () => {
    const tasks: Promise<void>[] = [];

    if (branch.distributor) {
      setDistributorSlice({
        kind: "distributor",
        title: "Contrato de distribuidora",
        contract: null,
        error: null,
        loading: true,
      });
      tasks.push(
        fetchDistributorContracts()
          .then((rows) => {
            const forParty = rows.filter(
              (row) => row.distributorId === branch.distributor!.id,
            );
            setDistributorSlice({
              kind: "distributor",
              title: "Contrato de distribuidora",
              contract: pickCurrentContract(forParty),
              error: null,
              loading: false,
            });
          })
          .catch((err) => {
            setDistributorSlice({
              kind: "distributor",
              title: "Contrato de distribuidora",
              contract: null,
              error: getDistributorContractsErrorMessage(err),
              loading: false,
            });
          }),
      );
    } else {
      setDistributorSlice(null);
    }

    if (branch.serviceCenter) {
      setServiceCenterSlice({
        kind: "serviceCenter",
        title: "Contrato de centro de servicio",
        contract: null,
        error: null,
        loading: true,
      });
      tasks.push(
        fetchServiceCenterContracts()
          .then((rows) => {
            const forParty = rows.filter(
              (row) => row.serviceCenterId === branch.serviceCenter!.id,
            );
            setServiceCenterSlice({
              kind: "serviceCenter",
              title: "Contrato de centro de servicio",
              contract: pickCurrentContract(forParty),
              error: null,
              loading: false,
            });
          })
          .catch((err) => {
            setServiceCenterSlice({
              kind: "serviceCenter",
              title: "Contrato de centro de servicio",
              contract: null,
              error: getServiceCenterContractsErrorMessage(err),
              loading: false,
            });
          }),
      );
    } else {
      setServiceCenterSlice(null);
    }

    await Promise.all(tasks);
  }, [branch.distributor, branch.serviceCenter]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const slices = useMemo(
    () =>
      [distributorSlice, serviceCenterSlice].filter(
        (slice): slice is ContractSlice => slice != null,
      ),
    [distributorSlice, serviceCenterSlice],
  );

  if (!open) return null;

  const subtitle =
    companyLabel.trim() || `${branch.city}, ${branch.state}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-contract-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(90vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="branch-contract-modal-title"
                className="text-lg font-semibold text-card-foreground"
              >
                Contrato
              </h2>
              <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          {slices.length === 0 ? (
            <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-3 text-sm text-muted">
              Esta empresa no requiere contrato de distribuidora ni de centro de
              servicio.
            </p>
          ) : (
            slices.map((slice) => (
              <ContractDownloadBlock key={slice.kind} slice={slice} />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDownloadBlock({ slice }: { slice: ContractSlice }) {
  if (slice.loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-card-foreground">
          {slice.title}
        </h3>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Cargando contrato…
        </p>
      </div>
    );
  }

  if (slice.error) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-card-foreground">
          {slice.title}
        </h3>
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {slice.error}
        </p>
      </div>
    );
  }

  if (!slice.contract) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-card-foreground">
          {slice.title}
        </h3>
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <FileText className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
          <span>No hay contrato registrado para descargar.</span>
        </p>
      </div>
    );
  }

  const docs = slice.contract.photoUrls ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground">
          {slice.title}
        </h3>
        <ContractStatusBadge
          startDate={slice.contract.startDate}
          endDate={slice.contract.endDate}
        />
      </div>
      <p className="text-sm text-muted">
        Vigencia: {formatContractDate(slice.contract.startDate)} –{" "}
        {formatContractDate(slice.contract.endDate)}
      </p>

      {docs.length === 0 ? (
        <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm text-muted">
          El contrato no tiene documentos adjuntos.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((url) => (
            <li key={url}>
              <a
                href={contractDocumentViewUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                download={contractDocumentLabel(url)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-foreground/5"
              >
                <span className="min-w-0 truncate text-card-foreground">
                  {isPdfUrl(url) ? "PDF" : "Imagen"}:{" "}
                  {contractDocumentLabel(url)}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-accent">
                  <Download className="size-4" aria-hidden />
                  Descargar
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
