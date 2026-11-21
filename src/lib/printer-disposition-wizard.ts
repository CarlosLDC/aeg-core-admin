import type { PrinterResponse } from "@/types/printer";

export type DispositionWizardStep = 1 | 2 | 3 | 4;

export const DISPOSITION_WIZARD_STEPS: {
  step: DispositionWizardStep;
  label: string;
}[] = [
  { step: 1, label: "Cliente" },
  { step: 2, label: "Factura" },
  { step: 3, label: "Encabezado y pie" },
  { step: 4, label: "Wi-Fi (opcional)" },
];

/**
 * Determines the starting step of the enajenación wizard modal.
 */
export function resolveDispositionInitialStep(
  printer: Pick<PrinterResponse, "clientId">,
  reconfigure: boolean,
): DispositionWizardStep {
  return reconfigure && printer.clientId != null ? 2 : 1;
}

/**
 * Returns the previous wizard step, or null when already on step 1.
 */
export function resolveDispositionPreviousStep(
  step: DispositionWizardStep,
): DispositionWizardStep | null {
  switch (step) {
    case 4:
      return 3;
    case 3:
      return 2;
    case 2:
      return 1;
    case 1:
    default:
      return null;
  }
}

/**
 * Returns the contextual subtitle displayed below the modal title for each step.
 */
export function resolveDispositionStepSubtitle(
  step: DispositionWizardStep,
  reconfigure: boolean,
): string {
  switch (step) {
    case 1:
      return reconfigure
        ? "Confirma el cliente antes de editar el ticket fiscal."
        : "Selecciona el cliente que recibirá la impresora.";
    case 2:
      return reconfigure
        ? "Confirma o actualiza el número de factura para previsualizar el ticket."
        : "Ingresa el número de factura comercial para previsualizar el ticket.";
    case 3:
      return reconfigure
        ? "Revisa y ajusta el encabezado y pie de ticket antes de guardar."
        : "Revisa y ajusta el encabezado y pie de ticket de la enajenación.";
    case 4:
      return "Opcional: configura el Wi-Fi por USB o finaliza directamente la enajenación.";
    default:
      return "";
  }
}

/**
 * Computes the primary action button label for the active step.
 */
export function resolveDispositionSubmitLabel({
  step,
  isReconfiguringTicket,
  wifiTouched,
}: {
  step: DispositionWizardStep;
  isReconfiguringTicket: boolean;
  wifiTouched: boolean;
}): string {
  if (step < 4) {
    return "Siguiente";
  }
  if (isReconfiguringTicket) {
    return wifiTouched ? "Guardar cambios" : "Omitir y guardar";
  }
  return wifiTouched ? "Confirmar enajenación" : "Omitir y confirmar";
}
