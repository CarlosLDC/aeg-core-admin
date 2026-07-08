"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  connectToolsWifi,
  getToolsMqttErrorMessage,
  resetToolsWifi,
  scanToolsWifi,
} from "@/lib/tools-mqtt-api";
import { useToast } from "@/context/toast-provider";

export function ToolsWifiPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [networks, setNetworks] = useState<Array<{ ssid: string; signal: number | null }>>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (action: "scan" | "connect" | "reset") => {
    setLoading(action);
    try {
      if (action === "scan") {
        const result = await scanToolsWifi(printer.id);
        setNetworks(result.networks ?? []);
        toast.success(
          result.networks?.length
            ? `${result.networks.length} red(es) encontrada(s).`
            : "Escaneo completado sin redes.",
        );
      } else if (action === "connect") {
        const result = await connectToolsWifi(printer.id, ssid, password);
        if (result.success) {
          toast.success(result.message ?? "Conexión WiFi enviada.");
        } else {
          toast.error(result.message ?? "No se pudo conectar.");
        }
      } else {
        const result = await resetToolsWifi(printer.id);
        toast.success(result.message ?? "Reinicio enviado.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Escanear redes</h3>
          <p className="mt-1 text-sm text-muted">
            Consulta las redes WiFi detectadas por la impresora.
          </p>
          <button
            type="button"
            disabled={loading != null}
            onClick={() => void run("scan")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {loading === "scan" ? <Loader2 className="size-4 animate-spin" /> : null}
            Escanear WiFi
          </button>
          {networks.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {networks.map((network) => (
                <li
                  key={network.ssid}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setSsid(network.ssid)}
                  >
                    {network.ssid}
                  </button>
                  {network.signal != null ? (
                    <span className="text-muted">{network.signal} dBm</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Conectar / reiniciar</h3>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-muted">SSID</span>
              <input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading != null || !ssid.trim()}
              onClick={() => void run("connect")}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
            >
              {loading === "connect" ? <Loader2 className="size-4 animate-spin" /> : null}
              Conectar
            </button>
            <button
              type="button"
              disabled={loading != null}
              onClick={() => void run("reset")}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300"
            >
              {loading === "reset" ? <Loader2 className="size-4 animate-spin" /> : null}
              Reiniciar impresora
            </button>
          </div>
        </section>
      </div>
    </ToolsPrinterMacGuard>
  );
}
