import { apiFetch } from "@/lib/api";
import type { BrokerMigrationConfigResult } from "@/lib/broker-migration-api";

export type FiscalizacionUsbPrecheckRequest = {
  ptrReg: string;
  precintoNro: string;
  precintoColor: string;
  mac?: string | null;
};

export type FiscalizacionUsbPrecheckResponse = {
  ok: boolean;
  errors: string[];
};

export type FiscalizacionUsbBrokerConfigResponse = {
  payload: Record<string, unknown>;
  newBrokerHost: string;
  legacyBrokerHost: string;
};

const BASE = "/api/mqtt/fiscalizacion/usb";

export async function precheckFiscalizacionUsb(
  body: FiscalizacionUsbPrecheckRequest,
): Promise<FiscalizacionUsbPrecheckResponse> {
  return apiFetch<FiscalizacionUsbPrecheckResponse>(`${BASE}/precheck`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchFiscalizacionBrokerConfig(): Promise<FiscalizacionUsbBrokerConfigResponse> {
  return apiFetch<FiscalizacionUsbBrokerConfigResponse>(`${BASE}/broker-config`);
}

export async function configureFiscalizacionBrokerByMac(
  mac: string,
): Promise<BrokerMigrationConfigResult> {
  return apiFetch<BrokerMigrationConfigResult>(`${BASE}/configure-broker`, {
    method: "POST",
    body: JSON.stringify({ mac }),
  });
}
