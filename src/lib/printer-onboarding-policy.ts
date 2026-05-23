import type { PrinterFormValues } from "@/lib/printer-form";

export type PrinterWizardStepSection =
  | "equipment"
  | "operation"
  | "assignment"
  | "technical";

const FISCAL_SERIAL_RE = /^[A-Z]{3}[0-9]{7}$/i;
const FIRMWARE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;

export function validatePrinterWizardSection(
  section: PrinterWizardStepSection,
  form: PrinterFormValues,
  options?: { omitFiscalSerial?: boolean },
): string | null {
  if (section === "equipment") {
    const modelId = Number(form.modelId);
    if (!form.modelId.trim() || !Number.isFinite(modelId) || modelId <= 0) {
      return "Selecciona un modelo fiscal válido.";
    }
    if (!options?.omitFiscalSerial) {
      const fiscalSerial = form.fiscalSerial.trim().toUpperCase();
      if (!fiscalSerial) {
        return "Indica el serial fiscal.";
      }
      if (!FISCAL_SERIAL_RE.test(fiscalSerial)) {
        return "El serial fiscal debe tener 3 letras y 7 dígitos (ej. ABC1234567).";
      }
    }
    return null;
  }

  if (section === "operation") {
    const price = form.finalSalePrice.trim();
    if (price && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      return "El precio de venta final debe ser un número mayor o igual a 0.";
    }
    return null;
  }

  if (section === "assignment") {
    const distributorId = form.distributorId.trim();
    if (distributorId && (!Number.isFinite(Number(distributorId)) || Number(distributorId) <= 0)) {
      return "Distribuidor no válido.";
    }
    const clientId = form.clientId.trim();
    if (clientId && (!Number.isFinite(Number(clientId)) || Number(clientId) <= 0)) {
      return "Cliente no válido.";
    }
    const softwareId = form.softwareId.trim();
    if (softwareId && (!Number.isFinite(Number(softwareId)) || Number(softwareId) <= 0)) {
      return "Software no válido.";
    }
    return null;
  }

  if (section === "technical") {
    const firmware = form.versionFirmware.trim();
    if (firmware && !FIRMWARE_RE.test(firmware)) {
      return "La versión de firmware debe tener el formato x.y.z (ej. 1.0.0).";
    }
    const mac = form.macAddress.trim().toUpperCase();
    if (mac && !MAC_RE.test(mac)) {
      return "La dirección MAC debe tener el formato AA:BB:CC:DD:EE:FF.";
    }
    if (form.installationDate.trim()) {
      const parsed = new Date(form.installationDate);
      if (Number.isNaN(parsed.getTime())) {
        return "La fecha de instalación no es válida.";
      }
    }
    return null;
  }

  return null;
}
