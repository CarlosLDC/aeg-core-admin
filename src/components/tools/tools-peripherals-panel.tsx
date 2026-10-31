"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Monitor } from "lucide-react";
import {
  ToolsActionButton,
  ToolsConnectionWarning,
  ToolsPage,
  ToolsPanelSection,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
} from "@/components/tools/tools-ui";
import { ToolsSimulatedDataNotice } from "@/components/tools/tools-ticket-preview";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/context/toast-provider";
import { formFieldInputClass, formFieldNativeSelectClass, toggleButtonClass } from "@/lib/toggle-button-styles";
import {
  CASH_DRAWER_PULSE_MAX_MS,
  CASH_DRAWER_PULSE_MIN_MS,
  CUSTOMER_DISPLAY_LINE_LENGTH,
  FORMAS_PAGO_COUNT,
  normalizePulseMs,
  validateCashDrawer,
  validateCustomerDisplay,
} from "@/lib/tools-ticket-style";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { cn } from "@/lib/utils";
import { useToolsCustomizationClient } from "@/modules/tools/customization/customization-client";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsSectionRefresh } from "@/modules/tools/mqtt/use-tools-section-refresh";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsTransport } from "@/modules/tools/transport/tools-transport-provider";
import type {
  ToolsCashDrawerConfig,
  ToolsCashDrawerMode,
  ToolsCustomerDisplayBaud,
  ToolsCustomerDisplayConfig,
  ToolsCustomerDisplayProtocol,
  ToolsPeripheralsConfig,
} from "@/types/tools-customization";

/** Nombres por defecto de configSPIFFS.json si no se pueden leer de la impresora. */
const DEFAULT_FORMAS_PAGO = [
  "EFECTIVO", "T. DEBITO", "T. CREDITO", "TRANSFERENCIA", "PAGO MOVIL", "BIOPAGO",
  "EFECTIVO 7", "EFECTIVO 8", "EFECTIVO 9", "EFECTIVO 10",
  "DIVISA 1", "DIVISA 2", "DIVISA 3", "DIVISA 4", "DIVISA 5", "DIVISA 6",
];

const DISPLAY_PROTOCOLS: { value: ToolsCustomerDisplayProtocol; label: string }[] = [
  { value: "ESCPOS", label: "ESC/POS genérico" },
  { value: "CD5220", label: "CD5220" },
  { value: "EPSON_DMD", label: "Epson DM-D" },
];

const DISPLAY_BAUDS: ToolsCustomerDisplayBaud[] = [2400, 4800, 9600, 19200];

function sameConfig(a: ToolsPeripheralsConfig | null, b: ToolsPeripheralsConfig | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function CustomerDisplayMock({ lines }: { lines: [string, string] }) {
  return (
    <div
      className="inline-block rounded-lg border-4 border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-base leading-tight tracking-wider text-emerald-400 shadow-inner"
      aria-label="Vista previa del visor"
    >
      {lines.map((line, index) => (
        <div key={index} className="whitespace-pre">
          {line.padEnd(CUSTOMER_DISPLAY_LINE_LENGTH, " ").slice(0, CUSTOMER_DISPLAY_LINE_LENGTH)}
        </div>
      ))}
    </div>
  );
}

function CheckboxField({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-[var(--color-accent,currentColor)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function ToolsPeripheralsPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const transport = useToolsTransport();
  const client = useToolsCustomizationClient(printer.id);
  const section = TOOLS_SECTIONS.peripherals;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    connectionIssue,
    mqttReady,
  } = useToolsPrinterConnection(printer.id, printer.macAddress);

  const [baseline, setBaseline] = useState<ToolsPeripheralsConfig | null>(null);
  const [draft, setDraft] = useState<ToolsPeripheralsConfig | null>(null);
  const [formasPago, setFormasPago] = useState<string[]>(DEFAULT_FORMAS_PAGO);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"drawer" | "display" | null>(null);

  // Con datos simulados se permite operar sin impresora conectada.
  const actionsDisabled = client.simulated ? false : remoteActionsDisabled;
  const busy = loading || saving || actionsDisabled;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await client.readPeripherals();
      setBaseline(config);
      setDraft(config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la configuración.");
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

  const { refreshAll, refreshLoading } = useToolsSectionRefresh(refreshStatus, load, statusLoading);

  useEffect(() => {
    void (async () => {
      await load();
      await refreshStatus();
    })();
  }, [load, refreshStatus]);

  // Nombres reales de formas de pago (solo si hay conexión; si falla, se usan los por defecto).
  useEffect(() => {
    if (!connectionResolved || remoteActionsDisabled) return;
    let cancelled = false;
    void transport
      .readFormasPago()
      .then((result) => {
        if (cancelled || !result.formasPago?.length) return;
        const names = [...DEFAULT_FORMAS_PAGO];
        for (const item of result.formasPago) {
          if (item.nro >= 1 && item.nro <= FORMAS_PAGO_COUNT) names[item.nro - 1] = item.descripcion;
        }
        setFormasPago(names);
      })
      .catch(() => {
        /* se mantienen los nombres por defecto */
      });
    return () => {
      cancelled = true;
    };
  }, [connectionResolved, remoteActionsDisabled, transport]);

  const hasChanges = useMemo(() => !sameConfig(baseline, draft), [baseline, draft]);

  const updateDrawer = (patch: Partial<ToolsCashDrawerConfig>) =>
    setDraft((current) => (current ? { ...current, gaveta: { ...current.gaveta, ...patch } } : current));
  const updateDisplay = (patch: Partial<ToolsCustomerDisplayConfig>) =>
    setDraft((current) => (current ? { ...current, visor: { ...current.visor, ...patch } } : current));

  const save = async () => {
    if (!draft) return;
    const error = validateCashDrawer(draft.gaveta) ?? validateCustomerDisplay(draft.visor);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const result = await client.writePeripherals(draft);
      if (result.success) {
        setBaseline(draft);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (kind: "drawer" | "display") => {
    if (!draft) return;
    setTesting(kind);
    try {
      const result =
        kind === "drawer"
          ? await client.testCashDrawer()
          : await client.testCustomerDisplay("PRUEBA DE VISOR", "TOTAL      Bs 123,45");
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "La prueba falló.");
    } finally {
      setTesting(null);
    }
  };

  const gaveta = draft?.gaveta;
  const visor = draft?.visor;

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
              statusRefresh={{ loading: refreshLoading, refreshStatus: refreshAll, mqttReady }}
            />
          }
        />

        {client.simulated ? <ToolsSimulatedDataNotice /> : null}

        {connectionResolved && connectionIssue !== "none" && connectionIssue !== "legacy-broker" ? (
          <ToolsConnectionWarning variant={connectionIssue} />
        ) : null}

        {loading && !draft ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Leyendo configuración de periféricos…
          </div>
        ) : gaveta && visor ? (
          <>
            <ToolsPanelSection
              title="Gaveta de dinero"
              description="Pulso eléctrico que abre la gaveta conectada al puerto RJ11/RJ12 de la impresora."
              icon={Banknote}
              tone="emerald"
              headerActions={
                <ToolsActionButton
                  loading={testing === "drawer"}
                  disabled={busy || !gaveta.activo || testing != null}
                  onClick={() => void runTest("drawer")}
                >
                  Probar apertura
                </ToolsActionButton>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Gaveta habilitada</FieldLabel>
                  <BooleanToggle
                    value={gaveta.activo}
                    onChange={(activo) => updateDrawer({ activo })}
                    disabled={busy}
                    ariaLabel="Gaveta habilitada"
                  />
                </div>
                <div>
                  <FieldLabel>Pin del conector</FieldLabel>
                  <SegmentedToggle
                    value={String(gaveta.pin) as "2" | "5"}
                    onChange={(pin) => updateDrawer({ pin: Number(pin) as 2 | 5 })}
                    disabled={busy || !gaveta.activo}
                    ariaLabel="Pin del conector"
                    options={[
                      { value: "2", label: "Pin 2" },
                      { value: "5", label: "Pin 5" },
                    ]}
                  />
                </div>
                <label className="block">
                  <FieldLabel>Duración del pulso (ms)</FieldLabel>
                  <input
                    type="number"
                    min={CASH_DRAWER_PULSE_MIN_MS}
                    max={CASH_DRAWER_PULSE_MAX_MS}
                    step={2}
                    className={formFieldInputClass}
                    value={gaveta.tOn}
                    disabled={busy || !gaveta.activo}
                    onChange={(e) => updateDrawer({ tOn: Number(e.target.value) })}
                    onBlur={(e) => updateDrawer({ tOn: normalizePulseMs(Number(e.target.value)) })}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Pausa posterior (ms)</FieldLabel>
                  <input
                    type="number"
                    min={CASH_DRAWER_PULSE_MIN_MS}
                    max={CASH_DRAWER_PULSE_MAX_MS}
                    step={2}
                    className={formFieldInputClass}
                    value={gaveta.tOff}
                    disabled={busy || !gaveta.activo}
                    onChange={(e) => updateDrawer({ tOff: Number(e.target.value) })}
                    onBlur={(e) => updateDrawer({ tOff: normalizePulseMs(Number(e.target.value)) })}
                  />
                </label>
                <div className="sm:col-span-2">
                  <FieldLabel>Abrir automáticamente al cerrar factura o nota de crédito</FieldLabel>
                  <SegmentedToggle<ToolsCashDrawerMode>
                    value={gaveta.modo}
                    onChange={(modo) => updateDrawer({ modo })}
                    disabled={busy || !gaveta.activo}
                    ariaLabel="Modo de apertura"
                    options={[
                      { value: "NUNCA", label: "Nunca" },
                      { value: "SIEMPRE", label: "Siempre" },
                      { value: "FP", label: "Según forma de pago" },
                    ]}
                  />
                </div>
                {gaveta.modo === "FP" ? (
                  <div className="sm:col-span-2">
                    <FieldLabel>Formas de pago que abren la gaveta</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {formasPago.map((name, index) => {
                        const nro = index + 1;
                        const selected = gaveta.fpAbre.includes(nro);
                        return (
                          <button
                            key={nro}
                            type="button"
                            aria-pressed={selected}
                            disabled={busy || !gaveta.activo}
                            className={toggleButtonClass(selected, "emerald", {
                              disabled: busy || !gaveta.activo,
                            })}
                            onClick={() =>
                              updateDrawer({
                                fpAbre: selected
                                  ? gaveta.fpAbre.filter((value) => value !== nro)
                                  : [...gaveta.fpAbre, nro].sort((a, b) => a - b),
                              })
                            }
                          >
                            <span className="tabular-nums text-xs opacity-70">{nro}</span> {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </ToolsPanelSection>

            <ToolsPanelSection
              title="Visor de precios"
              description="Visor de cliente (2 × 20) conectado al puerto de la impresora."
              icon={Monitor}
              tone="sky"
              headerActions={
                <ToolsActionButton
                  loading={testing === "display"}
                  disabled={busy || !visor.activo || testing != null}
                  onClick={() => void runTest("display")}
                >
                  Probar visor
                </ToolsActionButton>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Visor habilitado</FieldLabel>
                    <BooleanToggle
                      value={visor.activo}
                      onChange={(activo) => updateDisplay({ activo })}
                      disabled={busy}
                      ariaLabel="Visor habilitado"
                    />
                  </div>
                  <label className="block">
                    <FieldLabel>Protocolo</FieldLabel>
                    <select
                      className={formFieldNativeSelectClass}
                      value={visor.proto}
                      disabled={busy || !visor.activo}
                      onChange={(e) =>
                        updateDisplay({ proto: e.target.value as ToolsCustomerDisplayProtocol })
                      }
                    >
                      {DISPLAY_PROTOCOLS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <FieldLabel>Velocidad (baudios)</FieldLabel>
                    <SegmentedToggle
                      value={String(visor.baud)}
                      onChange={(baud) =>
                        updateDisplay({ baud: Number(baud) as ToolsCustomerDisplayBaud })
                      }
                      disabled={busy || !visor.activo}
                      ariaLabel="Velocidad en baudios"
                      options={DISPLAY_BAUDS.map((baud) => ({ value: String(baud), label: String(baud) }))}
                    />
                  </div>
                  {([0, 1] as const).map((index) => (
                    <label key={index} className="block">
                      <FieldLabel>Mensaje de bienvenida — línea {index + 1}</FieldLabel>
                      <input
                        type="text"
                        maxLength={CUSTOMER_DISPLAY_LINE_LENGTH}
                        className={cn(formFieldInputClass, "font-mono uppercase")}
                        value={visor.bienv[index]}
                        disabled={busy || !visor.activo}
                        onChange={(e) => {
                          const bienv: [string, string] = [...visor.bienv];
                          bienv[index] = e.target.value.toUpperCase();
                          updateDisplay({ bienv });
                        }}
                      />
                    </label>
                  ))}
                  <div className="sm:col-span-2">
                    <FieldLabel>Durante la venta mostrar</FieldLabel>
                    <div className="flex flex-wrap gap-4">
                      <CheckboxField
                        label="Último artículo y precio"
                        checked={visor.verItem}
                        disabled={busy || !visor.activo}
                        onChange={(verItem) => updateDisplay({ verItem })}
                      />
                      <CheckboxField
                        label="Total a pagar"
                        checked={visor.verTotal}
                        disabled={busy || !visor.activo}
                        onChange={(verTotal) => updateDisplay({ verTotal })}
                      />
                      <CheckboxField
                        label="Vuelto"
                        checked={visor.verVuelto}
                        disabled={busy || !visor.activo}
                        onChange={(verVuelto) => updateDisplay({ verVuelto })}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Brillo</FieldLabel>
                    <SegmentedToggle
                      value={String(visor.brillo)}
                      onChange={(brillo) => updateDisplay({ brillo: Number(brillo) })}
                      disabled={busy || !visor.activo}
                      ariaLabel="Brillo"
                      options={["1", "2", "3", "4"].map((value) => ({ value, label: value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 lg:pt-7">
                  <CustomerDisplayMock lines={visor.bienv} />
                  <span className="text-xs text-muted">Mensaje en reposo</span>
                </div>
              </div>
            </ToolsPanelSection>

            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2">
              <ToolsActionButton
                variant="primary"
                loading={saving}
                disabled={busy || !hasChanges}
                onClick={() => void save()}
              >
                Guardar
              </ToolsActionButton>
              <ToolsActionButton disabled={busy || !hasChanges} onClick={() => setDraft(baseline)}>
                Revertir
              </ToolsActionButton>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            No se pudo cargar la configuración de periféricos.
          </p>
        )}
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
