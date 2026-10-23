"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/context/toast-provider";
import { useFiscalizacionSse } from "@/hooks/use-fiscalizacion-sse";
import {
  FISCALIZACION_FLOW_STEPS,
  colorLabelForSeal,
} from "@/lib/fiscalizacion-mqtt-protocol";
import {
  configureFiscalizacionBrokerByMac,
  fetchFiscalizacionBrokerConfig,
  precheckFiscalizacionUsb,
  type FiscalizacionUsbBrokerConfigResponse,
} from "@/lib/fiscalizacion-usb-api";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import { createSeal, fetchSeals, getSealsErrorMessage } from "@/lib/seals-api";
import {
  buildBrokerConfigPayload,
  buildBrokerStatusPayload,
  buildFirmwareStatusPayload,
  buildFiscalizarRemotoPayload,
  buildStatusPayload,
  buildWifiConnectPayload,
  buildWifiScanPayload,
} from "@/modules/tools/serial/tools-command-builder";
import {
  CMD_CONFIG_MQTT_AEG,
  CMD_STAT_FIRM_SIN_DNF,
   CMD_WIFI_CONF,
  TOOLS_SERIAL_TIMEOUT_MS,
} from "@/modules/tools/serial/tools-serial-constants";
import {
  isBrokerStatusResponse,
  isStatusResponse,
  isWifiScanResponse,
  parseBrokerStatusResponse,
  parseFirmwareStatusResponse,
  parseSimpleAck,
  parseStatusResponse,
  parseWifiConnectResponse,
  parseWifiScanResponse,
} from "@/modules/tools/serial/tools-response-parser";
import {
  ToolsSerialPortSession,
  getToolsUsbErrorMessage,
  isWebSerialSupported,
} from "@/modules/tools/serial/tools-serial-port";
import type { SealColor, SealResponse } from "@/types/seal";
import type { ToolsWifiNetwork } from "@/types/tools-mqtt";

export type UsbDiagnostics = {
  wifiNetwork: string | null;
  ipAddress: string | null;
  seniatStatus: "EN LINEA" | "SIN CONEXION" | null;
  firmwareVersion: string | null;
  currentBrokerHost: string | null;
  brokerPort: number | null;
  detectedMac: string | null;
};

export type BrokerSetupStatus =
  | "unknown"
  | "checking"
  | "needs_migration"
  | "configuring_usb"
  | "usb_failed_needs_fallback"
  | "configuring_fallback"
  | "ready"
  | "error";

export type FiscalizacionRitualPhase =
  | "idle"
  | "prechecking"
  | "ready_to_confirm"
  | "sending_usb"
  | "waiting_ack"
  | "waiting_result"
  | "waiting_config_spiffs"
  | "done"
  | "failed";

const VALID_MAC_HEX = /^[0-9A-Fa-f]{12}$/;

export function normalizeMacInput(raw: string): string | null {
  const clean = raw.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!VALID_MAC_HEX.test(clean)) {
    return null;
  }
  return clean.match(/.{1,2}/g)?.join(":") ?? null;
}

export function hasValidIpAddress(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return (
    trimmed !== "" &&
    trimmed.toUpperCase() !== "N/A" &&
    trimmed !== "0.0.0.0"
  );
}

export function useFiscalizacionUsbWizard() {
  const toast = useToast();
  const sessionRef = useRef<ToolsSerialPortSession | null>(null);

  const [usbSupported, setUsbSupported] = useState(true);
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbBusy, setUsbBusy] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);

  const [brokerConfig, setBrokerConfig] =
    useState<FiscalizacionUsbBrokerConfigResponse | null>(null);

  const [diagnostics, setDiagnostics] = useState<UsbDiagnostics>({
    wifiNetwork: null,
    ipAddress: null,
    seniatStatus: null,
    firmwareVersion: null,
    currentBrokerHost: null,
    brokerPort: null,
    detectedMac: null,
  });

  // Wi-Fi state
  const [wifiNetworks, setWifiNetworks] = useState<ToolsWifiNetwork[]>([]);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiConnecting, setWifiConnecting] = useState(false);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");

  // Broker setup state
  const [brokerStatus, setBrokerStatus] =
    useState<BrokerSetupStatus>("unknown");
  const [brokerMessage, setBrokerMessage] = useState<string | null>(null);
  const [manualMac, setManualMac] = useState("");

  // Fiscal data & Seal state
  const [ptrReg, setPtrReg] = useState("");
  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [sealsLoading, setSealsLoading] = useState(true);
  const [selectedSealId, setSelectedSealId] = useState("");
  const [creatingSeal, setCreatingSeal] = useState(false);
  const [newSealSerial, setNewSealSerial] = useState("");
  const [newSealColor, setNewSealColor] = useState<SealColor>("azul");

  // Precheck & Fiscalization execution state
  const [precheckErrors, setPrecheckErrors] = useState<string[]>([]);
  const [precheckPassed, setPrecheckPassed] = useState(false);
  const [irreversibleConfirmed, setIrreversibleConfirmed] = useState(false);
  const [ritualPhase, setRitualPhase] =
    useState<FiscalizacionRitualPhase>("idle");
  const [ritualError, setRitualError] = useState<string | null>(null);

  useEffect(() => {
    setUsbSupported(isWebSerialSupported());
    sessionRef.current = new ToolsSerialPortSession();
    return () => {
      void sessionRef.current?.close();
    };
  }, []);

  const loadSeals = useCallback(async () => {
    setSealsLoading(true);
    try {
      const list = await fetchSeals();
      setSeals(list);
    } catch (err) {
      toast.error(getSealsErrorMessage(err));
    } finally {
      setSealsLoading(false);
    }
  }, [toast]);

  const loadBrokerConfig = useCallback(async () => {
    try {
      const cfg = await fetchFiscalizacionBrokerConfig();
      setBrokerConfig(cfg);
      return cfg;
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
      return null;
    }
  }, [toast]);

  useEffect(() => {
    void loadSeals();
    void loadBrokerConfig();
  }, [loadBrokerConfig, loadSeals]);

  const availableSeals = useMemo(
    () => seals.filter((s) => s.status === "disponible" && s.printerId == null),
    [seals],
  );

  const selectedSeal = useMemo(
    () =>
      availableSeals.find((s) => String(s.id) === selectedSealId) ?? null,
    [availableSeals, selectedSealId],
  );

  const effectiveMac = useMemo(() => {
    if (diagnostics.detectedMac) {
      return diagnostics.detectedMac;
    }
    return normalizeMacInput(manualMac);
  }, [diagnostics.detectedMac, manualMac]);

  const isBrokerReady = useMemo(() => {
    if (brokerStatus === "ready") return true;
    if (
      brokerConfig?.newBrokerHost &&
      diagnostics.currentBrokerHost &&
      diagnostics.currentBrokerHost.trim() === brokerConfig.newBrokerHost.trim()
    ) {
      return true;
    }
    return false;
  }, [brokerConfig?.newBrokerHost, brokerStatus, diagnostics.currentBrokerHost]);

  const sseEnabled =
    ritualPhase === "sending_usb" ||
    ritualPhase === "waiting_ack" ||
    ritualPhase === "waiting_result" ||
    ritualPhase === "waiting_config_spiffs" ||
    ritualPhase === "done";

  const sse = useFiscalizacionSse(
    effectiveMac,
    sseEnabled,
    ptrReg.trim().toUpperCase() || null,
  );

  // Sync SSE progress into ritualPhase
  useEffect(() => {
    if (!sseEnabled) return;
    if (sse.sessionError) {
      setRitualError(sse.sessionError);
      setRitualPhase("failed");
      return;
    }
    if (sse.completedPrinterId != null || sse.lastEvent?.type === "session_completed") {
      setRitualPhase("done");
      return;
    }
    if (sse.acceptedStepIds.has("result")) {
      setRitualPhase("waiting_config_spiffs");
      return;
    }
    if (sse.acceptedStepIds.has("ack")) {
      setRitualPhase("waiting_result");
    }
  }, [
    sse.acceptedStepIds,
    sse.completedPrinterId,
    sse.lastEvent,
    sse.sessionError,
    sseEnabled,
  ]);

  const requireSession = (): ToolsSerialPortSession => {
    const s = sessionRef.current;
    if (!s || !s.isConnected) {
      throw new Error("Conecte la impresora por USB antes de continuar.");
    }
    return s;
  };

  const runDiagnostics = useCallback(
    async (cfgOverride?: FiscalizacionUsbBrokerConfigResponse | null) => {
      const session = requireSession();
      setUsbBusy(true);
      setUsbError(null);
      try {
        const cfg = cfgOverride ?? brokerConfig ?? (await loadBrokerConfig());

        // 1. Estado general (Wi-Fi + IP)
        let wifiNetwork: string | null = null;
        let ipAddress: string | null = null;
        let seniatStatus: "EN LINEA" | "SIN CONEXION" | null = null;
        try {
          const statusItem = await session.publishAndAwaitMatcher(
            buildStatusPayload(),
            isStatusResponse,
            TOOLS_SERIAL_TIMEOUT_MS.status,
          );
          const parsedStatus = parseStatusResponse(statusItem);
          wifiNetwork = parsedStatus.additionalInfo?.wifiNetwork ?? null;
          ipAddress = parsedStatus.additionalInfo?.ipAddress ?? null;
          seniatStatus = parsedStatus.seniatStatus ?? null;
          if (
            wifiNetwork &&
            wifiNetwork !== "N/A" &&
            wifiNetwork.toUpperCase() !== "SIN CONEXION"
          ) {
            setWifiSsid((prev) => prev || wifiNetwork!);
          }
        } catch (err) {
          setUsbError(getToolsUsbErrorMessage(err, "No se pudo leer el estado general por USB."));
        }

        // 2. Estado de credenciales MQTT (host actual + MAC en TopicCmd/TopicRx)
        let currentBrokerHost: string | null = null;
        let brokerPort: number | null = null;
        let detectedMac: string | null = null;
        try {
          const brokerItem = await session.publishAndAwaitMatcher(
            buildBrokerStatusPayload(),
            isBrokerStatusResponse,
            TOOLS_SERIAL_TIMEOUT_MS.brokerStatus,
          );
          const parsedBroker = parseBrokerStatusResponse(brokerItem);
          currentBrokerHost = parsedBroker.host || null;
          brokerPort = parsedBroker.port;
          detectedMac = parsedBroker.mac;
        } catch {
          // Algunos firmwares pueden no responder EstCredMqtt1; continuamos con fallback
        }

        // 3. Versión de firmware
        let firmwareVersion: string | null = null;
        try {
          const firmItem = await session.publishAndAwaitObject(
            buildFirmwareStatusPayload(),
            CMD_STAT_FIRM_SIN_DNF,
            TOOLS_SERIAL_TIMEOUT_MS.firmware,
          );
          firmwareVersion = parseFirmwareStatusResponse(firmItem);
        } catch {
          // Opcional
        }

        setDiagnostics({
          wifiNetwork,
          ipAddress,
          seniatStatus,
          firmwareVersion,
          currentBrokerHost,
          brokerPort,
          detectedMac,
        });

        if (cfg && currentBrokerHost) {
          if (currentBrokerHost.trim() === cfg.newBrokerHost.trim()) {
            setBrokerStatus("ready");
            setBrokerMessage(
              `La impresora ya apunta al broker nuevo (${cfg.newBrokerHost}).`,
            );
          } else {
            setBrokerStatus("needs_migration");
            setBrokerMessage(
              `La impresora apunta a ${currentBrokerHost}. Debe asignarse el broker nuevo (${cfg.newBrokerHost}).`,
            );
          }
        } else {
          setBrokerStatus("needs_migration");
        }
      } finally {
        setUsbBusy(false);
      }
    },
    [brokerConfig, loadBrokerConfig],
  );

  const connectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setUsbBusy(true);
    setUsbError(null);
    try {
      await session.requestAndOpen();
      setUsbConnected(true);
      await runDiagnostics();
    } catch (err) {
      setUsbConnected(session.isConnected);
      setUsbError(getToolsUsbErrorMessage(err));
    } finally {
      setUsbBusy(false);
    }
  }, [runDiagnostics]);

  const disconnectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    await session.close();
    setUsbConnected(false);
  }, []);

  const scanWifi = useCallback(async () => {
    try {
      const session = requireSession();
      setWifiScanning(true);
      const item = await session.publishAndAwaitMatcher(
        buildWifiScanPayload(),
        isWifiScanResponse,
        TOOLS_SERIAL_TIMEOUT_MS.wifiScan,
      );
      const list = parseWifiScanResponse(item);
      setWifiNetworks(list);
    } catch (err) {
      toast.error(getToolsUsbErrorMessage(err, "No se pudieron escanear las redes Wi-Fi."));
    } finally {
      setWifiScanning(false);
    }
  }, [toast]);

  const connectWifi = useCallback(async () => {
    if (!wifiSsid.trim()) {
      toast.error("Seleccione o escriba el SSID de la red Wi-Fi.");
      return;
    }
    try {
      const session = requireSession();
      setWifiConnecting(true);
      const item = await session.publishAndAwaitObject(
        buildWifiConnectPayload(wifiSsid.trim(), wifiPassword),
        CMD_WIFI_CONF,
        TOOLS_SERIAL_TIMEOUT_MS.wifi,
      );
      parseWifiConnectResponse(item);
      toast.success("Red Wi-Fi configurada. Verificando dirección IP…");
      await runDiagnostics();
    } catch (err) {
      toast.error(getToolsUsbErrorMessage(err, "Error al configurar Wi-Fi."));
    } finally {
      setWifiConnecting(false);
    }
  }, [runDiagnostics, toast, wifiPassword, wifiSsid]);

  // Paso 3A: Configurar broker nuevo directamente por USB
  const configureBrokerOverUsb = useCallback(async () => {
    try {
      const session = requireSession();
      setBrokerStatus("configuring_usb");
      setBrokerMessage("Enviando credenciales del broker nuevo por USB…");
      const cfg = brokerConfig ?? (await loadBrokerConfig());
      if (!cfg) {
        setBrokerStatus("error");
        setBrokerMessage("No se pudo obtener la configuración del broker desde el servidor.");
        return;
      }

      const ack = await session.publishAndAwaitObject(
        buildBrokerConfigPayload(cfg.payload),
        CMD_CONFIG_MQTT_AEG,
        TOOLS_SERIAL_TIMEOUT_MS.brokerConfig,
      );
      parseSimpleAck(ack, "La impresora rechazó configMqttAEG");

      // Verificar con EstCredMqtt1 por USB
      try {
        const verifyItem = await session.publishAndAwaitMatcher(
          buildBrokerStatusPayload(),
          isBrokerStatusResponse,
          TOOLS_SERIAL_TIMEOUT_MS.brokerStatus,
        );
        const parsed = parseBrokerStatusResponse(verifyItem);
        setDiagnostics((prev) => ({
          ...prev,
          currentBrokerHost: parsed.host || prev.currentBrokerHost,
          brokerPort: parsed.port ?? prev.brokerPort,
          detectedMac: parsed.mac ?? prev.detectedMac,
        }));
      } catch {
        // Incluso si EstCredMqtt1 no responde tras el cambio, el ACK code=0 confirma recepción
      }

      setBrokerStatus("ready");
      setBrokerMessage(
        `Credenciales del broker nuevo (${cfg.newBrokerHost}) aplicadas por USB.`,
      );
      toast.success("Broker nuevo configurado por USB.");
    } catch (err) {
      setBrokerStatus("usb_failed_needs_fallback");
      setBrokerMessage(
        `${getToolsUsbErrorMessage(err, "No se recibió confirmación por USB.")} Puede usar el método alternativo por broker antiguo.`,
      );
    }
  }, [brokerConfig, loadBrokerConfig, toast]);

  // Paso 3B: Fallback por broker antiguo (MQTT) usando la MAC
  const configureBrokerViaFallback = useCallback(async () => {
    if (!effectiveMac) {
      toast.error(
        "Ingrese una dirección MAC válida (ej. 20:6E:F1:88:4C:68) para usar el método alternativo.",
      );
      return;
    }
    setBrokerStatus("configuring_fallback");
    setBrokerMessage(
      `Contactando a la impresora (${effectiveMac}) por el broker antiguo…`,
    );
    try {
      const res = await configureFiscalizacionBrokerByMac(effectiveMac);
      if (res.outcome === "MIGRATED") {
        setBrokerStatus("ready");
        setBrokerMessage(res.message);
        toast.success("Broker nuevo asignado mediante el método alternativo.");
        if (sessionRef.current?.isConnected) {
          await runDiagnostics();
        }
      } else {
        setBrokerStatus("error");
        setBrokerMessage(res.message);
        toast.error(res.message);
      }
    } catch (err) {
      const msg = getMqttErrorMessage(err);
      setBrokerStatus("error");
      setBrokerMessage(msg);
      toast.error(msg);
    }
  }, [effectiveMac, runDiagnostics, toast]);

  // Crear precinto nuevo inline
  const handleCreateSeal = useCallback(async () => {
    const serial = newSealSerial.trim().toUpperCase();
    if (!serial) {
      toast.error("Ingrese el serial del nuevo precinto.");
      return;
    }
    setCreatingSeal(true);
    try {
      const created = await createSeal({
        serial,
        color: newSealColor,
        status: "disponible",
      });
      await loadSeals();
      setSelectedSealId(String(created.id));
      setNewSealSerial("");
      setPrecheckPassed(false);
      toast.success(`Precinto ${created.serial} creado y seleccionado.`);
    } catch (err) {
      toast.error(getSealsErrorMessage(err));
    } finally {
      setCreatingSeal(false);
    }
  }, [loadSeals, newSealColor, newSealSerial, toast]);

  // Invalidar precheck cuando cambian datos fiscales
  useEffect(() => {
    setPrecheckPassed(false);
    setPrecheckErrors([]);
    setIrreversibleConfirmed(false);
  }, [ptrReg, selectedSealId, effectiveMac]);

  const runPrecheck = useCallback(async () => {
    if (!selectedSeal) {
      toast.error("Seleccione o cree un precinto disponible.");
      return;
    }
    if (!ptrReg.trim()) {
      toast.error("Ingrese el serial (registro) de la impresora.");
      return;
    }
    setRitualPhase("prechecking");
    setPrecheckErrors([]);
    try {
      const colorLabel = colorLabelForSeal(selectedSeal.color);
      const res = await precheckFiscalizacionUsb({
        ptrReg: ptrReg.trim().toUpperCase(),
        precintoNro: selectedSeal.serial,
        precintoColor: colorLabel,
        mac: effectiveMac,
      });
      if (res.ok) {
        setPrecheckPassed(true);
        setRitualPhase("ready_to_confirm");
        toast.success("Validación previa exitosa. Puede confirmar y fiscalizar.");
      } else {
        setPrecheckPassed(false);
        setPrecheckErrors(res.errors);
        setRitualPhase("idle");
      }
    } catch (err) {
      setPrecheckPassed(false);
      setPrecheckErrors([getMqttErrorMessage(err)]);
      setRitualPhase("idle");
    }
  }, [effectiveMac, ptrReg, selectedSeal, toast]);

  const startFiscalizacion = useCallback(async () => {
    if (!isBrokerReady) {
      toast.error("Primero debe confirmar que la impresora apunta al broker nuevo.");
      return;
    }
    if (!precheckPassed || !selectedSeal) {
      toast.error("Ejecute la validación previa antes de fiscalizar.");
      return;
    }
    if (!irreversibleConfirmed) {
      toast.error("Debe confirmar que comprende que la fiscalización es irreversible.");
      return;
    }
    try {
      const session = requireSession();
      setRitualError(null);
      sse.resetState();
      setRitualPhase("sending_usb");

      const payload = buildFiscalizarRemotoPayload({
        nroRegistro: ptrReg.trim().toUpperCase(),
        precintoNro: selectedSeal.serial,
        precintoColor: colorLabelForSeal(selectedSeal.color),
      });

      await session.publishFireAndForget(payload);
      setRitualPhase("waiting_ack");
      toast.success(
        "Comando ptrFiscalizarRemoto enviado por USB. Esperando comunicación MQTT de la impresora…",
      );
    } catch (err) {
      setRitualError(getToolsUsbErrorMessage(err, "No se pudo enviar ptrFiscalizarRemoto por USB."));
      setRitualPhase("failed");
    }
  }, [
    irreversibleConfirmed,
    isBrokerReady,
    precheckPassed,
    ptrReg,
    selectedSeal,
    sse,
    toast,
  ]);

  const resetWizardForNewPrinter = useCallback(() => {
    sse.resetState();
    setPtrReg("");
    setSelectedSealId("");
    setManualMac("");
    setPrecheckErrors([]);
    setPrecheckPassed(false);
    setIrreversibleConfirmed(false);
    setRitualPhase("idle");
    setRitualError(null);
    void loadSeals();
    if (sessionRef.current?.isConnected) {
      void runDiagnostics();
    }
  }, [loadSeals, runDiagnostics, sse]);

  return {
    usbSupported,
    usbConnected,
    usbBusy,
    usbError,
    connectUsb,
    disconnectUsb,
    runDiagnostics,
    diagnostics,
    brokerConfig,

    wifiNetworks,
    wifiScanning,
    wifiConnecting,
    wifiSsid,
    setWifiSsid,
    wifiPassword,
    setWifiPassword,
    scanWifi,
    connectWifi,

    brokerStatus,
    brokerMessage,
    isBrokerReady,
    manualMac,
    setManualMac,
    effectiveMac,
    configureBrokerOverUsb,
    configureBrokerViaFallback,

    ptrReg,
    setPtrReg,
    availableSeals,
    sealsLoading,
    selectedSealId,
    setSelectedSealId,
    selectedSeal,
    creatingSeal,
    newSealSerial,
    setNewSealSerial,
    newSealColor,
    setNewSealColor,
    handleCreateSeal,

    precheckErrors,
    precheckPassed,
    irreversibleConfirmed,
    setIrreversibleConfirmed,
    runPrecheck,
    startFiscalizacion,
    ritualPhase,
    ritualError,
    sse,
    flowSteps: FISCALIZACION_FLOW_STEPS,
    resetWizardForNewPrinter,
  };
}
