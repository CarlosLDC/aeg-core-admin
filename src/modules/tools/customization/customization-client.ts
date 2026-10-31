"use client";

import { useMemo } from "react";
import { defaultPeripheralsConfig } from "@/lib/tools-ticket-style";
import {
  LOGO_DEFAULT_MAX_HEIGHT,
  LOGO_DEFAULT_MAX_WIDTH,
} from "@/lib/tools-logo-bitmap";
import type {
  ToolsCustomizationSimpleResult,
  ToolsPeripheralsConfig,
  ToolsPrinterCapabilities,
  ToolsTicketAlign,
  ToolsTicketLogo,
  ToolsTicketStyles,
} from "@/types/tools-customization";

/**
 * Cliente de periféricos y personalización del ticket.
 *
 * TODO(tools-customization): cuando firmware y Core implementen el contrato
 * (aeg-core/core/docs/TOOLS_PERIFERICOS_TICKET_MQTT.md), mover estos métodos a
 * `ToolsPrinterTransport` (MQTT + USB) y eliminar la implementación simulada.
 */
export interface ToolsCustomizationClient {
  readonly simulated: boolean;
  readCapabilities(): Promise<ToolsPrinterCapabilities>;
  readPeripherals(): Promise<ToolsPeripheralsConfig>;
  writePeripherals(config: ToolsPeripheralsConfig): Promise<ToolsCustomizationSimpleResult>;
  testCashDrawer(): Promise<ToolsCustomizationSimpleResult>;
  testCustomerDisplay(lin1: string, lin2: string): Promise<ToolsCustomizationSimpleResult>;
  readTicketStyles(): Promise<ToolsTicketStyles>;
  writeTicketStyles(styles: ToolsTicketStyles): Promise<ToolsCustomizationSimpleResult>;
  readLogo(): Promise<ToolsTicketLogo | null>;
  writeLogo(
    logo: ToolsTicketLogo,
    onProgress?: (sent: number, total: number) => void,
  ): Promise<ToolsCustomizationSimpleResult>;
  updateLogoSettings(settings: {
    activo: boolean;
    alin: ToolsTicketAlign;
  }): Promise<ToolsCustomizationSimpleResult>;
  deleteLogo(): Promise<ToolsCustomizationSimpleResult>;
}

const STORAGE_PREFIX = "aeg-tools-customization-mock";
const LATENCY_MS = 450;

type MockState = {
  peripherals: ToolsPeripheralsConfig;
  styles: ToolsTicketStyles;
  logo: ToolsTicketLogo | null;
};

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok(message: string): ToolsCustomizationSimpleResult {
  return { success: true, message };
}

export function createMockCustomizationClient(printerId: number): ToolsCustomizationClient {
  const key = `${STORAGE_PREFIX}:${printerId}`;

  const load = (): MockState => {
    const fallback: MockState = {
      peripherals: defaultPeripheralsConfig(),
      styles: { enc: [], pie: [] },
      logo: null,
    };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<MockState>) } : fallback;
    } catch {
      return fallback;
    }
  };

  const save = (patch: Partial<MockState>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify({ ...load(), ...patch }));
  };

  return {
    simulated: true,
    async readCapabilities() {
      await delay(200);
      return {
        gaveta: true,
        visor: true,
        logo: true,
        estilos: true,
        anchoPapelPx: LOGO_DEFAULT_MAX_WIDTH,
        logoMaxAlto: LOGO_DEFAULT_MAX_HEIGHT,
      };
    },
    async readPeripherals() {
      await delay();
      return load().peripherals;
    },
    async writePeripherals(config) {
      await delay();
      save({ peripherals: config });
      return ok("Configuración de periféricos guardada (simulado).");
    },
    async testCashDrawer() {
      await delay();
      return ok("Pulso de apertura enviado a la gaveta (simulado).");
    },
    async testCustomerDisplay(lin1, lin2) {
      await delay();
      return ok(`Mensaje enviado al visor: "${lin1}" / "${lin2}" (simulado).`);
    },
    async readTicketStyles() {
      await delay();
      return load().styles;
    },
    async writeTicketStyles(styles) {
      await delay();
      save({ styles });
      return ok("Estilos del ticket guardados (simulado).");
    },
    async readLogo() {
      await delay();
      return load().logo;
    },
    async writeLogo(logo, onProgress) {
      const total = Math.max(1, Math.ceil((logo.datos.length * 3) / 4 / 1024));
      for (let sent = 1; sent <= total; sent++) {
        await delay(180);
        onProgress?.(sent, total);
      }
      save({ logo });
      return ok("Logo guardado en la impresora (simulado).");
    },
    async updateLogoSettings(settings) {
      await delay();
      const current = load().logo;
      if (!current) return { success: false, message: "No hay logo cargado." };
      save({ logo: { ...current, ...settings } });
      return ok("Ajustes del logo guardados (simulado).");
    },
    async deleteLogo() {
      await delay();
      save({ logo: null });
      return ok("Logo eliminado (simulado).");
    },
  };
}

export function useToolsCustomizationClient(printerId: number): ToolsCustomizationClient {
  return useMemo(() => createMockCustomizationClient(printerId), [printerId]);
}
