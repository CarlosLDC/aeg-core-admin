"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
  toolsListItemClass,
  toolsSelectableListItemClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  readToolsFormasPago,
  writeToolsFormasPago,
} from "@/lib/tools-mqtt-api";
import type { ToolsFormasPagoItem } from "@/types/tools-mqtt";
import { formFieldInputClass, formFieldTextareaClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

export function ToolsFormasPagoPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const [items, setItems] = useState<ToolsFormasPagoItem[]>([]);
  const [selectedNro, setSelectedNro] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading("read");
    try {
      const result = await readToolsFormasPago(printer.id);
      setItems(result.formasPago ?? []);
      toast.success("Formas de pago cargadas.");
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const save = async () => {
    if (selectedNro === "" || !descripcion.trim()) {
      toast.error("Seleccione una forma de pago e ingrese la descripción.");
      return;
    }
    setLoading("write");
    try {
      const result = await writeToolsFormasPago(
        printer.id,
        selectedNro,
        descripcion.trim(),
      );
      if (result.success) {
        toast.success(result.message ?? "Forma de pago actualizada.");
        await load();
      } else {
        toast.error(result.message ?? "No se pudo actualizar.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <div className="space-y-4">
        <ToolsPanelSection
          title="Formas de pago"
          headerActions={
            <ToolsActionButton
              loading={loading === "read"}
              disabled={loading != null}
              onClick={() => void load()}
            >
              Leer de impresora
            </ToolsActionButton>
          }
        >
          {items.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {items.map((item) => {
                const selected = selectedNro === item.nro;
                return (
                <li key={item.nro}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedNro(item.nro);
                      setDescripcion(item.descripcion);
                    }}
                    className={toolsSelectableListItemClass(selected)}
                  >
                    <span className="font-medium text-card-foreground">
                      #{item.nro}
                    </span>{" "}
                    <span className="text-muted">— {item.descripcion}</span>
                  </button>
                </li>
              );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Pulse «Leer de impresora» para cargar las formas de pago actuales.
            </p>
          )}
        </ToolsPanelSection>

        <ToolsPanelSection title="Editar descripción">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel className="text-muted">Número FP</FieldLabel>
              <input
                type="number"
                value={selectedNro}
                onChange={(e) =>
                  setSelectedNro(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={formFieldInputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel className="text-muted">Descripción</FieldLabel>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className={formFieldTextareaClass}
              />
            </label>
          </div>
          <ToolsPanelActions className="mt-4">
            <ToolsActionButton
              variant="primary"
              loading={loading === "write"}
              disabled={loading != null}
              onClick={() => void save()}
            >
              Guardar en impresora
            </ToolsActionButton>
          </ToolsPanelActions>
        </ToolsPanelSection>
      </div>
    </ToolsPrinterMacGuard>
  );
}
