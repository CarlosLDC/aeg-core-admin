"use client";

import { useState } from "react";
import { Link2, Power, Radio } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsPage,
  ToolsPanelActions,
  ToolsPanelGrid,
  ToolsPanelSection,
  ToolsSectionHeading,
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
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ToolsWifiPanelProps = {
  printer: ToolsPrinter;
};

export function ToolsWifiPanel({ printer }: ToolsWifiPanelProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.wifi;
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
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
        />

        <ToolsPanelGrid className="xl:grid-cols-2">
          <ToolsPanelSection
            title="Escanear redes"
            description="Consulta las redes WiFi detectadas por la impresora."
            icon={Radio}
            tone="sky"
          >
            <ToolsActionButton
              loading={loading === "scan"}
              disabled={loading != null}
              onClick={() => void run("scan")}
            >
              Escanear WiFi
            </ToolsActionButton>
            {networks.length > 0 ? (
              <div className="mt-4 max-h-56 overflow-y-auto overscroll-y-contain rounded-lg border border-border bg-background/50 p-1">
                <ul className="space-y-2 text-sm" aria-label="Redes detectadas">
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
                        className="w-full text-left font-medium text-card-foreground transition-colors hover:text-accent"
                        onClick={() => setSsid(network.ssid)}
                      >
                        {network.ssid}
                      </button>
                      {network.signal != null ? (
                        <span className="shrink-0 text-muted">
                          {network.signal} dBm
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </ToolsPanelSection>

          <ToolsPanelSection
            title="Conectar / reiniciar"
            description="Seleccione una red y envíe las credenciales a la impresora."
            icon={Link2}
            tone="sky"
          >
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
                <Power className="size-4" aria-hidden />
                Reiniciar
              </ToolsActionButton>
            </ToolsPanelActions>
          </ToolsPanelSection>
        </ToolsPanelGrid>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
