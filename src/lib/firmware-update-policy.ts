/** Versión de firmware actual recomendada / esperada. */
export const CURRENT_FIRMWARE_VERSION = "1.1.2";

/**
 * Compara dos versiones semánticas (x.y.z).
 * Retorna:
 *  > 0 si a > b
 *  < 0 si a < b
 *  0 si a === b
 */
export function compareFirmwareVersions(a: string, b: string): number {
  const cleanA = a.trim();
  const cleanB = b.trim();
  const pa = cleanA.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = cleanB.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) {
      return va - vb;
    }
  }
  return 0;
}

/**
 * Determina si una versión de firmware requiere actualización respecto a la versión actual.
 * Si versionFirmware está ausente, vacía o es menor a CURRENT_FIRMWARE_VERSION, requiere actualización.
 */
export function isFirmwareUpdateRequired(
  versionFirmware: string | null | undefined,
  currentVersion: string = CURRENT_FIRMWARE_VERSION,
): boolean {
  if (!versionFirmware || !versionFirmware.trim()) {
    return true;
  }
  return compareFirmwareVersions(versionFirmware, currentVersion) < 0;
}
