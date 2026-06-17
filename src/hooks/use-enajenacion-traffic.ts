"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnajenacionSse } from "@/hooks/use-enajenacion-sse";
import {
  buildEnajenacionTrafficCatalog,
  type EnajenacionTrafficEntry,
  type EnajenacionTrafficTopics,
} from "@/lib/enajenacion-traffic-catalog";
import { loadEnajenacionCommandContext } from "@/lib/load-enajenacion-command-context";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import {
  compactMac,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  isPrinterEligibleForEnajenacionTest,
  type EnajenacionCommandContext,
} from "@/lib/enajenacion-mqtt-protocol";
import { fetchClientById } from "@/lib/clients-api";
import { fetchPrinterById } from "@/lib/printers-api";
import type { PrinterResponse } from "@/types/printer";

export function useEnajenacionTraffic() {
  const searchParams = useSearchParams();
  const printerIdParam = searchParams.get("printerId");
  const printerId = printerIdParam ? Number(printerIdParam) : null;

  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
  const [clientName, setClientName] = useState<string>("—");
  const [printerLoading, setPrinterLoading] = useState(true);
  const [printerError, setPrinterError] = useState<string | null>(null);

  const [commandContext, setCommandContext] =
    useState<EnajenacionCommandContext | null>(null);
  const [commandContextLoading, setCommandContextLoading] = useState(false);
  const [commandContextError, setCommandContextError] = useState<string | null>(
    null,
  );

  const topics = useMemo((): EnajenacionTrafficTopics | null => {
    if (!printer?.macAddress) return null;
    const mac = compactMac(printer.macAddress);
    return {
      mac,
      cmdServer: fiscalCmdServerTopic(mac),
      comando: fiscalComandoTopic(mac),
      monitor: fiscalMonitorTopic(mac),
    };
  }, [printer?.macAddress]);

  const sse = useEnajenacionSse(topics?.mac ?? null, Boolean(topics));

  useEffect(() => {
    if (!printerId || Number.isNaN(printerId)) {
      setPrinter(null);
      setPrinterError(
        printerIdParam ? "ID de impresora inválido." : "Falta el parámetro printerId.",
      );
      setPrinterLoading(false);
      return;
    }

    let cancelled = false;
    setPrinterLoading(true);
    setPrinterError(null);

    void (async () => {
      try {
        const loaded = await fetchPrinterById(printerId);
        if (cancelled) return;

        if (!isPrinterEligibleForEnajenacionTest(loaded)) {
          setPrinter(null);
          setPrinterError(
            "La impresora no es apta para enajenación MQTT (requiere cliente, MAC, serial y estatus válido).",
          );
          return;
        }

        setPrinter(loaded);

        if (loaded.clientId) {
          try {
            const client = await fetchClientById(loaded.clientId);
            if (!cancelled) {
              setClientName(
                client.companyBusinessName?.trim() || "Cliente desconocido",
              );
            }
          } catch {
            if (!cancelled) setClientName("Cliente desconocido");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPrinter(null);
          setPrinterError(getMqttErrorMessage(err));
        }
      } finally {
        if (!cancelled) setPrinterLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [printerId, printerIdParam]);

  useEffect(() => {
    if (!printer) {
      setCommandContext(null);
      setCommandContextError(null);
      return;
    }

    let cancelled = false;
    setCommandContextLoading(true);
    setCommandContextError(null);

    void loadEnajenacionCommandContext(printer)
      .then((ctx) => {
        if (!cancelled) setCommandContext(ctx);
      })
      .catch((err) => {
        if (!cancelled) {
          setCommandContext(null);
          setCommandContextError(getMqttErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setCommandContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [printer]);

  const catalog = useMemo((): EnajenacionTrafficEntry[] => {
    if (!commandContext || !topics || !printer?.macAddress) return [];
    return buildEnajenacionTrafficCatalog({
      commandContext,
      macAddress: printer.macAddress,
      topics,
      liveServerCommands: sse.serverCommandsByStepId,
    });
  }, [
    commandContext,
    printer?.macAddress,
    sse.serverCommandsByStepId,
    topics,
  ]);

  return {
    printerId,
    printer,
    clientName,
    topics,
    catalog,
    printerLoading,
    printerError,
    commandContextLoading,
    commandContextError,
    sseStatus: sse.status,
  };
}
