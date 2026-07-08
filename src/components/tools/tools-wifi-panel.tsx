"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
  toolsListItemClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  connectToolsWifi,
  getToolsMqttErrorMessage,
  resetToolsWifi,
  scanToolsWifi,
} from "@/lib/tools-mqtt-api";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ToolsWifiPanelProps = {
  printer: ToolsPrinter;
};

export function ToolsWifiPanel({ printer }: ToolsWifiPanelProps) {
  const toast = useToast();
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [networks, setNetworks] = useState<
    Array<{ ssid: string; signal: number | null }>
  >([]);
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
        <ToolsPanelSection
          title="Escanear redes"
          description="Consulta las redes WiFi detectadas por la impresora."
        >
          <ToolsActionButton
            loading={loading === "scan"}
            disabled={loading != null}
            onClick={() => void run("scan")}
          >
            Escanear WiFi
          </ToolsActionButton>
          {networks.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {networks.map((network) => (
                <li
                  key={network.ssid}
                  className={cn(
                    toolsListItemClass,
                    "flex items-center justify-between",
                  )}
                >
                  <button
                    type="button"
                    className="font-medium text-card-foreground hover:text-accent"
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
        </ToolsPanelSection>

        <ToolsPanelSection title="Conectar / reiniciar">
          <div className="space-y-3">
            <label className="block">
              <FieldLabel className="text-muted">SSID</FieldLabel>
              <input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className={formFieldInputClass}
              />
            </label>
            <label className="block">
              <FieldLabel className="text-muted">Contraseña</FieldLabel>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={formFieldInputClass}
              />
            </label>
          </div>
          <ToolsPanelActions className="mt-4">
            <ToolsActionButton
              variant="primary"
              loading={loading === "connect"}
              disabled={loading != null || !ssid.trim()}
              onClick={() => void run("connect")}
            >
              Conectar
            </ToolsActionButton>
            <ToolsActionButton
              variant="danger"
              loading={loading === "reset"}
              disabled={loading != null}
              onClick={() => void run("reset")}
            >
              Reiniciar impresora
            </ToolsActionButton>
          </ToolsPanelActions>
        </ToolsPanelSection>
      </div>
    </ToolsPrinterMacGuard>
  );
}
