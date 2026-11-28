import { parsePaymentAmount } from "@/lib/commercial-payment-form";
import { todayIsoDate } from "@/lib/datetime-form";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentMethod,
} from "@/types/commercial-payment";

export type AssignmentWizardStep = 1 | 2 | 3;

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
 * Creates a blank payment draft initialized with today's date.
 */
export function createEmptyAssignmentPaymentDraft(
  key = "composer",
): AssignmentPaymentDraft {
  return {
    key,
    mode: "manual",
    metodoBanco: "BNC",
    referencia: "",
    monto: "",
    cuentaDestino: "",
    fechaPago: todayIsoDate(),
    notas: "",
  };
}

/**
 * Returns true when the draft contains user-entered payment details
 * beyond the default method and date.
 */
export function hasAssignmentPaymentDetails(
  draft: AssignmentPaymentDraft,
): boolean {
  return Boolean(
    draft.monto.trim() ||
      draft.referencia.trim() ||
      draft.cuentaDestino.trim() ||
      draft.notas.trim(),
  );
}

/**
 * Steps for the printer assignment wizard.
 */
export function getAssignmentWizardSteps(includePayments = true): {
  step: AssignmentWizardStep;
  label: string;
}[] {
  const steps: { step: AssignmentWizardStep; label: string }[] = [
    { step: 1, label: "Distribuidora" },
    { step: 2, label: "Estado de pago" },
  ];
  if (includePayments) {
    steps.push({ step: 3, label: "Pagos" });
  }
  return steps;
}

/**
 * Contextual subtitle shown below the modal title for each wizard step.
 */
export function resolveAssignmentStepSubtitle(step: AssignmentWizardStep): string {
  switch (step) {
    case 1:
      return "Selecciona la distribuidora a la que asignarás esta impresora.";
    case 2:
      return "Indica si la impresora ya fue pagada. Se creará una orden sin número ni monto.";
    case 3:
      return "Opcional. Escanea un comprobante o ingresa los datos y añádelos a la lista de pagos.";
  }
}

/**
 * Primary footer submit label for the active assignment wizard step.
 */
export function resolveAssignmentSubmitLabel(
  step: AssignmentWizardStep,
  includePayments = true,
): string {
  const lastStep: AssignmentWizardStep = includePayments ? 3 : 2;
  return step < lastStep ? "Siguiente" : "Asignar impresora";
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
 * Validates a single payment draft and converts it to an API payload.
 */
export function validateAssignmentPaymentDraft(
  draft: AssignmentPaymentDraft,
  options?: { label?: string; requireDetails?: boolean },
): AssignmentPaymentPayload | string {
  const prefix = options?.label ? `${options.label}: ` : "";
  if (draft.mode === "choose") {
    return `${prefix}escanea el comprobante o llena los datos.`;
  }
  if (!COMMERCIAL_PAYMENT_METHODS.includes(draft.metodoBanco)) {
    return `${prefix}método / banco no válido.`;
  }
  const parsedMonto = parsePaymentAmount(draft.monto);
  if (parsedMonto === "invalid") {
    return `${prefix}el monto debe ser un número mayor o igual a 0.`;
  }
  const referencia = trimToNull(draft.referencia);
  if (referencia && referencia.length > 100) {
    return `${prefix}la referencia no puede superar los 100 caracteres.`;
  }
  const cuentaDestino = trimToNull(draft.cuentaDestino);
  if (cuentaDestino && cuentaDestino.length > 100) {
    return `${prefix}la cuenta destino no puede superar los 100 caracteres.`;
  }
  const fechaPago = trimToNull(draft.fechaPago);
  if (fechaPago && !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
    return `${prefix}la fecha de pago no es válida.`;
  }
  const notas = trimToNull(draft.notas);
  if (notas && notas.length > 500) {
    return `${prefix}las notas no pueden superar los 500 caracteres.`;
  }
  if (
    options?.requireDetails &&
    parsedMonto === null &&
    referencia === null &&
    cuentaDestino === null &&
    notas === null
  ) {
    return `${prefix}indica al menos el monto, referencia, cuenta destino o notas del pago.`;
  }
  return {
    metodoBanco: draft.metodoBanco,
    referencia,
    monto: parsedMonto,
    cuentaDestino,
    fechaPago,
    notas,
  };
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
    const result = validateAssignmentPaymentDraft(draft, {
      label: `Pago ${index + 1}`,
    });
    if (typeof result === "string") {
      return result;
    }
    payloads.push(result);
  }
  return payloads;
}

/**
 * Computes the total monetary amount across drafts that have a valid amount.
 */
export function sumAssignmentPaymentAmounts(drafts: AssignmentPaymentDraft[]): {
  total: number;
  countWithAmount: number;
} {
  let totalCents = 0;
  let countWithAmount = 0;
  for (const draft of drafts) {
    const parsed = parsePaymentAmount(draft.monto);
    if (typeof parsed === "number") {
      totalCents += Math.round(parsed * 100);
      countWithAmount += 1;
    }
  }
  return {
    total: totalCents / 100,
    countWithAmount,
  };
}

/**
 * Confirmation message shown when closing the assignment modal with unsaved payments.
 */
export function buildAssignmentCloseConfirmMessage(paymentCount: number): string {
  if (paymentCount === 1) {
    return "Has añadido 1 pago en esta asignación. Si cierras el modal, se perderá.";
  }
  return `Has añadido ${paymentCount} pagos en esta asignación. Si cierras el modal, se perderán.`;
}
