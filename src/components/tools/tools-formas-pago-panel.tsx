"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ToolsActionButton,
  ToolsPanelSection,
  toolsListItemClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
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
import type { ToolsFormasPagoItem } from "@/types/tools-mqtt";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

const inlineDescriptionInputClass = cn(
  formFieldInputClass,
  "h-9 min-w-0 flex-1 py-1.5",
);

function draftsFromItems(items: ToolsFormasPagoItem[]): Record<number, string> {
  return Object.fromEntries(
    items.map((item) => [item.nro, item.descripcion] as const),
  );
}

export function ToolsFormasPagoPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const [items, setItems] = useState<ToolsFormasPagoItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingNro, setSavingNro] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.nro - b.nro),
    [items],
  );

  const load = useCallback(
    async (options?: { notify?: boolean }) => {
      setLoading(true);
      try {
        const result = await readToolsFormasPago(printer.id);
        const nextItems = result.formasPago ?? [];
        setItems(nextItems);
        setDrafts(draftsFromItems(nextItems));
        if (options?.notify) {
          toast.success("Formas de pago actualizadas.");
        }
      } catch (err) {
        toast.error(getToolsMqttErrorMessage(err));
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    },
    [printer.id, toast],
  );

  useEffect(() => {
    void load();
  }, [load]);

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
    if (descripcion === original) return;

    setSavingNro(nro);
    try {
      const result = await writeToolsFormasPago(printer.id, nro, descripcion);
      if (result.success) {
        setItems((current) =>
          current.map((item) =>
            item.nro === nro ? { ...item, descripcion } : item,
          ),
        );
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
      <ToolsPanelSection
        title="Formas de pago"
        headerActions={
          <ToolsActionButton
            loading={loading}
            disabled={loading || savingNro != null}
            onClick={() => void load({ notify: true })}
          >
            Actualizar
          </ToolsActionButton>
        }
      >
        {loading && !initialLoadDone ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Leyendo formas de pago de la impresora…
          </div>
        ) : sortedItems.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {sortedItems.map((item) => {
              const isDivisa = isFormaPagoDivisa(item.nro);
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
                    toolsListItemClass,
                    "flex flex-wrap items-center gap-2 sm:flex-nowrap",
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
                      <span className="min-w-0 flex-1 font-medium">
                        {item.descripcion}
                      </span>
                      <span className="shrink-0 rounded-full border border-emerald-600/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                        Divisa
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={draft}
                        maxLength={FORMAS_PAGO_DESCRIPCION_MAX_LENGTH}
                        disabled={loading || isSaving}
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
                        }}
                        aria-label={`Descripción forma de pago ${item.nro}`}
                        className={inlineDescriptionInputClass}
                      />
                      <ToolsActionButton
                        variant={isDirty ? "primary" : "default"}
                        loading={isSaving}
                        disabled={
                          loading ||
                          isSaving ||
                          !isDirty ||
                          !draft.trim() ||
                          validateFormaPagoDescripcion(draft) != null
                        }
                        onClick={() => void saveItem(item.nro)}
                        className="w-full shrink-0 sm:w-auto"
                      >
                        Guardar
                      </ToolsActionButton>
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
      </ToolsPanelSection>
    </ToolsPrinterMacGuard>
  );
}
