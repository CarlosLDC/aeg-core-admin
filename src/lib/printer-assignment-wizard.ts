import type {
  CommercialInvoiceFormValues,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type { CompanyResponse } from "@/types/company";

export type AssignmentWizardStep = 1 | 2;

export type AssignmentInvoiceMode = "existing" | "new";

/**
 * Steps for the 2-step printer assignment wizard.
 */
export function getAssignmentWizardSteps(
  showCommercialInvoice: boolean,
): { step: AssignmentWizardStep; label: string }[] {
  return [
    { step: 1, label: "Distribuidora" },
    { step: 2, label: showCommercialInvoice ? "Pago y factura" : "Pago" },
  ];
}

/**
 * Contextual subtitle shown below the modal title for each wizard step.
 */
export function resolveAssignmentStepSubtitle(
  step: AssignmentWizardStep,
  showCommercialInvoice: boolean,
): string {
  if (step === 1) {
    return "Selecciona la distribuidora a la que asignarás esta impresora.";
  }
  return showCommercialInvoice
    ? "Indica el estado de pago y vincula o crea una factura comercial (opcional)."
    : "Indica si la impresora ya fue pagada antes de confirmar la asignación.";
}

/**
 * Primary footer submit label for the active assignment wizard step.
 */
export function resolveAssignmentSubmitLabel(
  step: AssignmentWizardStep,
): string {
  return step === 1 ? "Siguiente" : "Asignar impresora";
}

/**
 * Resolves the company ID matching a distributor RIF (case-insensitive).
 */
export function resolveCompanyIdForDistributorRif(
  distributorRif: string | undefined,
  companies: Pick<CompanyResponse, "id" | "rif">[],
): string {
  const normalized = distributorRif?.trim().toUpperCase() ?? "";
  if (!normalized) return "";
  const match = companies.find(
    (company) => (company.rif ?? "").trim().toUpperCase() === normalized,
  );
  return match ? String(match.id) : "";
}

/**
 * Builds default values for creating a commercial invoice inline during assignment.
 */
export function defaultAssignmentNewInvoiceForm(
  paid: boolean,
  defaultEmpresaId?: string,
): CommercialInvoiceFormValues {
  return {
    numeroFactura: "",
    empresaId: defaultEmpresaId ?? "",
    modalidad: paid ? "VENTA" : "CONSIGNACION",
    estadoCobro: paid ? "PAGADO" : "PENDIENTE_PAGO",
    montoTotal: "",
  };
}

/**
 * Syncs modality and collection status defaults when payment status changes,
 * preserving fields already modified by the user.
 */
export function syncNewInvoiceDefaultsForPaid(
  current: CommercialInvoiceFormValues,
  paid: boolean,
  touched: { modalidad: boolean; estadoCobro: boolean },
): CommercialInvoiceFormValues {
  const defaults = defaultAssignmentNewInvoiceForm(paid, current.empresaId);
  return {
    ...current,
    modalidad: touched.modalidad ? current.modalidad : defaults.modalidad,
    estadoCobro: touched.estadoCobro
      ? current.estadoCobro
      : defaults.estadoCobro,
  };
}

/**
 * Sorts commercial invoices prioritizing the currently linked invoice,
 * then invoices matching the selected distributor RIF, newest first.
 */
export function sortCommercialInvoicesForAssignment(
  invoices: CommercialInvoiceResponse[],
  currentInvoiceId: number | null | undefined,
  distributorRif: string | undefined,
): CommercialInvoiceResponse[] {
  const distRif = distributorRif?.trim().toUpperCase() ?? "";

  return [...invoices].sort((a, b) => {
    const aLinked = currentInvoiceId != null && a.id === currentInvoiceId ? 0 : 1;
    const bLinked = currentInvoiceId != null && b.id === currentInvoiceId ? 0 : 1;
    if (aLinked !== bLinked) return aLinked - bLinked;

    if (distRif) {
      const aMatch =
        (a.empresaRif ?? "").trim().toUpperCase() === distRif ? 0 : 1;
      const bMatch =
        (b.empresaRif ?? "").trim().toUpperCase() === distRif ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}
