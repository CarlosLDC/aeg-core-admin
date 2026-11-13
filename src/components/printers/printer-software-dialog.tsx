"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { SoftwareFormDialog } from "@/components/software/software-form-dialog";
import { useConfirm } from "@/context/confirm-provider";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { fetchSoftware } from "@/lib/software-api";
import { fetchCompanies } from "@/lib/companies-api";
import { updatePrinterSoftware } from "@/lib/printers-api";
import {
  cancelSoftwareModificationRequest,
  createSoftwareModificationRequest,
  fetchPendingSoftwareModificationRequest,
  getSoftwareModificationRequestsErrorMessage,
} from "@/lib/software-modification-requests-api";
import { toSoftwareRequest, type SoftwareFormValues } from "@/lib/software-form";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import type { SoftwareModificationRequestDetailResponse } from "@/types/software-modification-request";
import type { SoftwareResponse } from "@/types/software";
import { isDistributorPanelRole } from "@/types/user";

export type PrinterSoftwareDialogProps = {
  printer: PrinterResponse;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: PrinterResponse) => void;
};

export function PrinterSoftwareDialog({
  printer,
  open,
  onClose,
  onSaved,
}: PrinterSoftwareDialogProps) {
  const { user } = useAuth();
  const isDistributor = isDistributorPanelRole(user?.role);
  const toast = useToast();
  const confirm = useConfirm();
  const titleId = useId();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softwareList, setSoftwareList] = useState<SoftwareResponse[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState<string>(
    printer.softwareId != null ? String(printer.softwareId) : "0",
  );

  const [pendingSoftware, setPendingSoftware] =
    useState<SoftwareModificationRequestDetailResponse | null>(null);
  const [cancellingPending, setCancellingPending] = useState(false);

  const [newSoftwareModalOpen, setNewSoftwareModalOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [newSoftwareSaving, setNewSoftwareSaving] = useState(false);
  const [newSoftwareError, setNewSoftwareError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoadingSoftware(true);
    fetchSoftware()
      .then((rows) => {
        if (!cancelled) setSoftwareList(rows);
      })
      .catch(() => {
        if (!cancelled) setSoftwareList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSoftware(false);
      });

    fetchPendingSoftwareModificationRequest(printer.id)
      .then((res) => {
        if (!cancelled) setPendingSoftware(res);
      })
      .catch(() => {
        if (!cancelled) setPendingSoftware(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, printer.id]);

  const softwareOptions = useMemo(() => {
    const list = [
      { id: 0, label: "— Sin software asignado —" },
      ...softwareList.map((sw) => ({
        id: sw.id,
        label: `${sw.name} (v${sw.version})`,
      })),
    ];
    return list;
  }, [softwareList]);

  function handleOpenNewSoftwareModal() {
    setNewSoftwareError(null);
    setNewSoftwareModalOpen(true);
    if (!isDistributor && companies.length === 0) {
      fetchCompanies()
        .then(setCompanies)
        .catch(() => setCompanies([]));
    }
  }

  async function handleNewSoftwareSubmit(values: SoftwareFormValues) {
    const req = toSoftwareRequest(values);
    if (typeof req === "string") {
      setNewSoftwareError(req);
      return;
    }
    setNewSoftwareSaving(true);
    setNewSoftwareError(null);
    try {
      await createSoftwareModificationRequest({
        printerId: printer.id,
        name: req.name,
        version: req.version,
        programmingLanguages: req.programmingLanguages,
        operatingSystems: req.operatingSystems,
        developerName: req.developerName,
        developerRif: req.developerRif,
        external: req.external,
        distributorCompanyIds: req.distributorCompanyIds,
      });
      toast.success(
        "Solicitud enviada con éxito. Un administrador debe aprobar la entrada primero.",
      );
      setNewSoftwareModalOpen(false);
      const updated = await fetchPendingSoftwareModificationRequest(printer.id);
      setPendingSoftware(updated);
    } catch (err) {
      const msg = getSoftwareModificationRequestsErrorMessage(err);
      setNewSoftwareError(msg);
      toast.error(msg);
    } finally {
      setNewSoftwareSaving(false);
    }
  }

  async function handleCancelPendingSoftware() {
    if (!pendingSoftware) return;
    const ok = await confirm({
      title: "Cancelar solicitud",
      message: `¿Deseas cancelar la solicitud pendiente para ${pendingSoftware.name} v${pendingSoftware.version}?`,
      destructive: true,
    });
    if (!ok) return;

    setCancellingPending(true);
    try {
      await cancelSoftwareModificationRequest(pendingSoftware.id);
      toast.success("Solicitud de software cancelada.");
      setPendingSoftware(null);
    } catch (err) {
      toast.error(getSoftwareModificationRequestsErrorMessage(err));
    } finally {
      setCancellingPending(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const swId =
        selectedValue && selectedValue !== "0" ? Number(selectedValue) : null;
      const updated = await updatePrinterSoftware(printer.id, swId);
      toast.success(`Software de la impresora ${printer.fiscalSerial} actualizado.`);
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg =
        getSoftwareModificationRequestsErrorMessage(err) ||
        "Error al actualizar software.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <PrinterActionDialogShell
        title="Gestionar software"
        titleId={titleId}
        printer={printer}
        saving={saving}
        error={error}
        onClose={onClose}
        submitLabel="Guardar software"
        onSubmit={handleSubmit}
        submitDisabled={saving}
        submitLoading={saving}
        size="lg"
      >
        <div className="space-y-4">
          {pendingSoftware && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                    <Clock className="size-3.5" />
                    Solicitud de software pendiente
                  </p>
                  <p className="mt-1 font-medium">
                    Se solicitó incorporar:{" "}
                    <strong>
                      {pendingSoftware.name} v{pendingSoftware.version}
                    </strong>
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700/90 dark:text-amber-300/90">
                    Un administrador debe aprobar la entrada primero. Una vez aprobada, se asignará automáticamente a esta impresora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancelPendingSoftware()}
                  disabled={cancellingPending}
                  className="shrink-0 rounded-lg border border-amber-600/30 bg-amber-600/10 px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-600/20 dark:text-amber-100"
                >
                  {cancellingPending ? "Cancelando..." : "Cancelar solicitud"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Selecciona un software del catálogo o solicita uno nuevo.
            </span>
            <button
              type="button"
              onClick={handleOpenNewSoftwareModal}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              <Plus className="size-3.5" />
              Solicitar nuevo software
            </button>
          </div>

          <PrinterActionPickerPanel
            label="Software disponible"
            searchPlaceholder="Buscar por nombre o versión…"
            query={searchQuery}
            onQueryChange={setSearchQuery}
            options={softwareOptions}
            selectedValue={selectedValue}
            onSelect={setSelectedValue}
            loading={loadingSoftware}
            emptyMessage="No hay softwares registrados"
            noResultsMessage="No se encontró ningún software con ese término"
          />
        </div>
      </PrinterActionDialogShell>

      {newSoftwareModalOpen && (
        <SoftwareFormDialog
          mode="create"
          open={newSoftwareModalOpen}
          saving={newSoftwareSaving}
          error={newSoftwareError}
          companies={companies}
          hideDistributorsStep
          onClose={() => {
            if (!newSoftwareSaving) setNewSoftwareModalOpen(false);
          }}
          onSubmit={(values) => void handleNewSoftwareSubmit(values)}
        />
      )}
    </>
  );
}
