"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  readToolsFormasPago,
  writeToolsFormasPago,
} from "@/lib/tools-mqtt-api";
import type { ToolsFormasPagoItem } from "@/types/tools-mqtt";
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
      const result = await writeToolsFormasPago(printer.id, selectedNro, descripcion.trim());
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
        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">Formas de pago</h3>
            <button
              type="button"
              disabled={loading != null}
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
            >
              {loading === "read" ? <Loader2 className="size-4 animate-spin" /> : null}
              Leer de impresora
            </button>
          </div>

          {items.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.nro}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNro(item.nro);
                      setDescripcion(item.descripcion);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-left hover:bg-foreground/[0.03]"
                  >
                    <span className="font-medium">#{item.nro}</span> — {item.descripcion}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Pulse «Leer de impresora» para cargar las formas de pago actuales.
            </p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Editar descripción</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Número FP</span>
              <input
                type="number"
                value={selectedNro}
                onChange={(e) =>
                  setSelectedNro(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted">Descripción</span>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={loading != null}
            onClick={() => void save()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {loading === "write" ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar en impresora
          </button>
        </section>
      </div>
    </ToolsPrinterMacGuard>
  );
}
