import { createSeal, updateSeal } from "@/lib/seals-api";
import type { SealColor, SealRequest, SealResponse } from "@/types/seal";

export type PrinterSealsSummary = {
  activeSeal: SealResponse | null;
  historicalSeals: SealResponse[];
  totalAssignedCount: number;
};

/**
 * Agrupa los precintos asociados a una impresora en precinto activo (en_impresora)
 * y precintos históricos (sustituido u otros), ordenados cronológicamente descendente.
 */
export function getPrinterSealsSummary(
  seals: SealResponse[],
  printerId: number,
): PrinterSealsSummary {
  const printerSeals = seals.filter((s) => s.printerId === printerId);

  const activeSeal =
    printerSeals.find((s) => s.status === "en_impresora") ?? null;

  const historicalSeals = printerSeals
    .filter((s) => s.id !== activeSeal?.id)
    .sort((a, b) => {
      const dateA = a.removalDate || a.installationDate || a.createdAt;
      const dateB = b.removalDate || b.installationDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  return {
    activeSeal,
    historicalSeals,
    totalAssignedCount: printerSeals.length,
  };
}

/**
 * Obtiene los precintos que están listos para ser asignados a una impresora.
 */
export function getAvailableSeals(seals: SealResponse[]): SealResponse[] {
  return seals
    .filter((s) => s.status === "disponible")
    .sort((a, b) => a.serial.localeCompare(b.serial, "es", { numeric: true }));
}

function normalizeIsoDate(value?: string | null): string {
  if (!value || !value.trim()) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

export type InstallSealParams = {
  seal: SealResponse;
  printerId: number;
  previousActiveSeal?: SealResponse | null;
  installationDate?: string;
};

/**
 * Instala / asocia un precinto existente en la impresora.
 * Si ya existía un precinto activo previo, lo marca automáticamente como 'sustituido' con fecha de retiro.
 */
export async function installSealOnPrinter({
  seal,
  printerId,
  previousActiveSeal,
  installationDate,
}: InstallSealParams): Promise<SealResponse> {
  const installIso = normalizeIsoDate(installationDate);

  if (previousActiveSeal && previousActiveSeal.id !== seal.id) {
    const retireRequest: SealRequest = {
      printerId: previousActiveSeal.printerId,
      serial: previousActiveSeal.serial,
      color: previousActiveSeal.color,
      status: "sustituido",
      installationDate: previousActiveSeal.installationDate,
      removalDate: installIso,
      creationBatchId: previousActiveSeal.creationBatchId,
    };
    await updateSeal(previousActiveSeal.id, retireRequest);
  }

  const installRequest: SealRequest = {
    printerId,
    serial: seal.serial,
    color: seal.color,
    status: "en_impresora",
    installationDate: installIso,
    removalDate: null,
    creationBatchId: seal.creationBatchId,
  };

  return updateSeal(seal.id, installRequest);
}

export type CreateAndInstallSealParams = {
  serial: string;
  color: SealColor;
  printerId: number;
  installationDate?: string;
  previousActiveSeal?: SealResponse | null;
};

/**
 * Crea un nuevo precinto y lo asocia directamente a la impresora como 'en_impresora'.
 * Si ya existía un precinto activo previo, lo marca como 'sustituido'.
 */
export async function createAndInstallSeal({
  serial,
  color,
  printerId,
  installationDate,
  previousActiveSeal,
}: CreateAndInstallSealParams): Promise<SealResponse> {
  const installIso = normalizeIsoDate(installationDate);

  if (previousActiveSeal) {
    const retireRequest: SealRequest = {
      printerId: previousActiveSeal.printerId,
      serial: previousActiveSeal.serial,
      color: previousActiveSeal.color,
      status: "sustituido",
      installationDate: previousActiveSeal.installationDate,
      removalDate: installIso,
      creationBatchId: previousActiveSeal.creationBatchId,
    };
    await updateSeal(previousActiveSeal.id, retireRequest);
  }

  const createRequest: SealRequest = {
    printerId,
    serial: serial.trim(),
    color,
    status: "en_impresora",
    installationDate: installIso,
    removalDate: null,
  };

  return createSeal(createRequest);
}

export type RetireCurrentSealParams = {
  seal: SealResponse;
  removalDate?: string;
};

/**
 * Retira el precinto activo actual de la impresora marcándolo como 'sustituido'.
 */
export async function retireCurrentSeal({
  seal,
  removalDate,
}: RetireCurrentSealParams): Promise<SealResponse> {
  const removalIso = normalizeIsoDate(removalDate);

  const request: SealRequest = {
    printerId: seal.printerId,
    serial: seal.serial,
    color: seal.color,
    status: "sustituido",
    installationDate: seal.installationDate,
    removalDate: removalIso,
    creationBatchId: seal.creationBatchId,
  };

  return updateSeal(seal.id, request);
}

export type UnlinkSealParams = {
  seal: SealResponse;
};

/**
 * Desvincula un precinto de la impresora y lo vuelve a dejar en estatus 'disponible'.
 */
export async function unlinkSealFromPrinter({
  seal,
}: UnlinkSealParams): Promise<SealResponse> {
  const request: SealRequest = {
    printerId: null,
    serial: seal.serial,
    color: seal.color,
    status: "disponible",
    installationDate: null,
    removalDate: null,
    creationBatchId: seal.creationBatchId,
  };

  return updateSeal(seal.id, request);
}
