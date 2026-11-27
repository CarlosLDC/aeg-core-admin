import { parsePaymentAmount } from "@/lib/commercial-payment-form";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentMethod,
} from "@/types/commercial-payment";

export type AssignmentWizardStep = 1 | 2;

export type AssignmentPaymentDraft = {
  key: string;
  mode?: "choose" | "manual";
  metodoBanco: CommercialPaymentMethod;
  referencia: string;
  monto: string;
  cuentaDestino: string;
  fechaPago: string;
  notas: string;
};

export type AssignmentPaymentPayload = {
  metodoBanco: CommercialPaymentMethod;
  referencia: string | null;
  monto: number | null;
  cuentaDestino: string | null;
  fechaPago: string | null;
  notas: string | null;
};

/**
 * Steps for the 2-step printer assignment wizard.
 */
export function getAssignmentWizardSteps(): {
  step: AssignmentWizardStep;
  label: string;
}[] {
  return [
    { step: 1, label: "Distribuidora" },
    { step: 2, label: "Pago" },
  ];
}

/**
 * Contextual subtitle shown below the modal title for each wizard step.
 */
export function resolveAssignmentStepSubtitle(step: AssignmentWizardStep): string {
  if (step === 1) {
    return "Selecciona la distribuidora a la que asignarás esta impresora.";
  }
  return "Indica si ya fue pagada y, si aplica, registra uno o más pagos. La orden se crea sin número ni monto.";
}

/**
 * Primary footer submit label for the active assignment wizard step.
 */
export function resolveAssignmentSubmitLabel(step: AssignmentWizardStep): string {
  return step === 1 ? "Siguiente" : "Asignar impresora";
}

/**
 * Explains the printer status and the order that will be created.
 */
export function assignmentOutcomeHint(paid: boolean, paymentCount: number): string {
  if (paid) {
    return "La impresora quedará Asignada. Se creará una orden de venta pagada, sin número ni monto; Finanzas los completará después.";
  }
  if (paymentCount > 0) {
    return "Con estos abonos la impresora queda en consignación y la orden queda a crédito (venta con cobro parcial). Finanzas completará el número y el monto.";
  }
  return "La impresora quedará en consignación. Se creará una orden sin número ni monto; Finanzas los completará después.";
}

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates payment drafts captured during assignment.
 * An empty list is valid.
 */
export function assignmentPaymentsToRequest(
  drafts: AssignmentPaymentDraft[],
): AssignmentPaymentPayload[] | string {
  const payloads: AssignmentPaymentPayload[] = [];
  for (const [index, draft] of drafts.entries()) {
    const label = `Pago ${index + 1}`;
    if (draft.mode === "choose") {
      return `${label}: escanea el comprobante o llena los datos.`;
    }
    if (!COMMERCIAL_PAYMENT_METHODS.includes(draft.metodoBanco)) {
      return `${label}: método / banco no válido.`;
    }
    const parsedMonto = parsePaymentAmount(draft.monto);
    if (parsedMonto === "invalid") {
      return `${label}: el monto debe ser un número mayor o igual a 0.`;
    }
    const referencia = trimToNull(draft.referencia);
    if (referencia && referencia.length > 100) {
      return `${label}: la referencia no puede superar los 100 caracteres.`;
    }
    const cuentaDestino = trimToNull(draft.cuentaDestino);
    if (cuentaDestino && cuentaDestino.length > 100) {
      return `${label}: la cuenta destino no puede superar los 100 caracteres.`;
    }
    const fechaPago = trimToNull(draft.fechaPago);
    if (fechaPago && !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
      return `${label}: la fecha de pago no es válida.`;
    }
    const notas = trimToNull(draft.notas);
    if (notas && notas.length > 500) {
      return `${label}: las notas no pueden superar los 500 caracteres.`;
    }
    payloads.push({
      metodoBanco: draft.metodoBanco,
      referencia,
      monto: parsedMonto,
      cuentaDestino,
      fechaPago,
      notas,
    });
  }
  return payloads;
}
