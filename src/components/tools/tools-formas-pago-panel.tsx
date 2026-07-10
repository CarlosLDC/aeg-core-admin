"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import {
  ToolsActionButton,
  ToolsConnectionWarning,
  ToolsPage,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
  toolsListItemClass,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsSectionRefresh } from "@/modules/tools/mqtt/use-tools-section-refresh";
import {
  getToolsMqttErrorMessage,
  readToolsFormasPago,
  writeToolsFormasPago,
} from "@/lib/tools-mqtt-api";
import {
  isFormaPagoDivisa,
  normalizeFormaPagoDescripcion,
  FORMAS_PAGO_DESCRIPCION_MAX_LENGTH,
  validateFormaPagoDescripcion,
} from "@/lib/tools-formas-pago";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import type { ToolsFormasPagoItem } from "@/types/tools-mqtt";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

const rowClass = cn(
  toolsListItemClass,
  "flex h-11 items-center gap-2 py-0 sm:flex-nowrap",
);

const inlineDescriptionInputClass = cn(
  formFieldInputClass,
  "h-8 min-w-0 flex-1 py-1",
);

const rowActionButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

const editIconButtonClass = rowActionButtonClass;

function draftsFromItems(items: ToolsFormasPagoItem[]): Record<number, string> {
  return Object.fromEntries(
    items.map((item) => [item.nro, item.descripcion] as const),
  );
}

export function ToolsFormasPagoPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.formasPago;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    isOnline,
    mqttReady,
  } = useToolsPrinterConnection(printer.id, printer.macAddress);
  const [items, setItems] = useState<ToolsFormasPagoItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [editingNro, setEditingNro] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingNro, setSavingNro] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.nro - b.nro),
    [items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setEditingNro(null);
    try {
      const result = await readToolsFormasPago(printer.id);
      const nextItems = result.formasPago ?? [];
      setItems(nextItems);
      setDrafts(draftsFromItems(nextItems));
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [printer.id, toast]);

  const { refreshAll, refreshLoading } = useToolsSectionRefresh(
    refreshStatus,
    load,
    statusLoading,
  );

  useEffect(() => {
    void load();
    void refreshStatus();
  }, [load, refreshStatus]);

  const startEditing = (nro: number) => {
    const original =
      items.find((item) => item.nro === nro)?.descripcion ?? "";
    setDrafts((current) => ({ ...current, [nro]: original }));
    setEditingNro(nro);
  };

  const cancelEditing = (nro: number) => {
    const original =
      items.find((item) => item.nro === nro)?.descripcion ?? "";
    setDrafts((current) => ({ ...current, [nro]: original }));
    setEditingNro(null);
  };

  const saveItem = async (nro: number) => {
    if (isFormaPagoDivisa(nro)) return;

    const descripcion = drafts[nro]?.trim() ?? "";
    const validationError = validateFormaPagoDescripcion(descripcion);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const original =
      items.find((item) => item.nro === nro)?.descripcion.trim() ?? "";
    if (descripcion === original) {
      setEditingNro(null);
      return;
    }

    setSavingNro(nro);
    try {
      const result = await writeToolsFormasPago(printer.id, nro, descripcion);
      if (result.success) {
        setItems((current) =>
          current.map((item) =>
            item.nro === nro ? { ...item, descripcion } : item,
          ),
        );
        setEditingNro(null);
        toast.success(result.message ?? `Forma de pago #${nro} actualizada.`);
      } else {
        toast.error(result.message ?? "No se pudo actualizar.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSavingNro(null);
    }
  };

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
          actions={
            <ToolsSectionStatusActions
              statusRefresh={{
                loading: refreshLoading,
                refreshStatus: refreshAll,
                mqttReady,
              }}
            />
          }
        />

        {connectionResolved && !isOnline ? <ToolsConnectionWarning /> : null}

        <div className={toolsPanelSectionClass}>
          {loading && !initialLoadDone ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Leyendo formas de pago de la impresora…
            </div>
          ) : sortedItems.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {sortedItems.map((item) => {
                const isDivisa = isFormaPagoDivisa(item.nro);
                const isEditing = editingNro === item.nro;
                const draft = drafts[item.nro] ?? item.descripcion;
                const original =
                  items.find((entry) => entry.nro === item.nro)?.descripcion ??
                  "";
                const isDirty = draft.trim() !== original.trim();
                const isSaving = savingNro === item.nro;

                return (
                  <li
                    key={item.nro}
                    className={cn(
                      rowClass,
                      isDivisa &&
                        "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
                    )}
                  >
                    <span
                      className={cn(
                        "w-10 shrink-0 font-medium tabular-nums",
                        isDivisa
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-card-foreground",
                      )}
                    >
                      #{item.nro}
                    </span>

                    {isDivisa ? (
                      <>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.descripcion}
                        </span>
                        <span className="shrink-0 rounded-full border border-emerald-600/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                          Divisa
                        </span>
                      </>
                    ) : isEditing ? (
                      <>
                        <input
                          type="text"
                          value={draft}
                          maxLength={FORMAS_PAGO_DESCRIPCION_MAX_LENGTH}
                          disabled={loading || isSaving || remoteActionsDisabled}
                          autoFocus
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.nro]: normalizeFormaPagoDescripcion(
                                e.target.value,
                              ),
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveItem(item.nro);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditing(item.nro);
                            }
                          }}
                          aria-label={`Descripción forma de pago ${item.nro}`}
                          className={inlineDescriptionInputClass}
                        />
                        <div className="flex w-[4.25rem] shrink-0 items-center justify-end gap-1">
                          <button
                            type="button"
                            className={rowActionButtonClass}
                            disabled={
                              loading ||
                              isSaving ||
                              remoteActionsDisabled ||
                              !isDirty ||
                              !draft.trim() ||
                              validateFormaPagoDescripcion(draft) != null
                            }
                            onClick={() => void saveItem(item.nro)}
                            aria-label={`Guardar forma de pago ${item.nro}`}
                          >
                            {isSaving ? (
                              <Loader2
                                className="size-3.5 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check className="size-3.5" aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            className={rowActionButtonClass}
                            disabled={loading || isSaving}
                            onClick={() => cancelEditing(item.nro)}
                            aria-label={`Cancelar edición forma de pago ${item.nro}`}
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.descripcion}
                        </span>
                        <div className="flex w-[4.25rem] shrink-0 justify-end">
                          <button
                            type="button"
                            className={editIconButtonClass}
                            disabled={
                              loading || savingNro != null || remoteActionsDisabled
                            }
                            onClick={() => startEditing(item.nro)}
                            aria-label={`Editar forma de pago ${item.nro}`}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : initialLoadDone ? (
            <p className="text-sm text-muted">
              No se recibieron formas de pago desde la impresora.
            </p>
          ) : null}
        </div>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
