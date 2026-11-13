import type {
  InventoryBoxRequest,
  InventoryBoxResponse,
} from "@/types/inventory-box";

export type InventoryBoxFormValues = {
  boxNumber: string;
  observations: string;
};

export function formatInventoryBoxLabel(boxNumber: number): string {
  return `Caja ${boxNumber}`;
}

export function emptyInventoryBoxForm(
  nextBoxNumber?: number,
): InventoryBoxFormValues {
  return {
    boxNumber: nextBoxNumber != null ? String(nextBoxNumber) : "",
    observations: "",
  };
}

export function inventoryBoxToFormValues(
  box: InventoryBoxResponse,
): InventoryBoxFormValues {
  return {
    boxNumber: String(box.boxNumber),
    observations: box.observations ?? "",
  };
}

export function toInventoryBoxRequest(
  values: InventoryBoxFormValues,
): InventoryBoxRequest | string {
  const rawNumber = values.boxNumber.trim();
  if (!rawNumber) {
    return "El número de caja es obligatorio.";
  }

  const parsed = Number(rawNumber);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return "El número de caja debe ser un entero positivo.";
  }

  const trimmedObservations = values.observations.trim();
  if (trimmedObservations.length > 255) {
    return "Las observaciones no pueden superar los 255 caracteres.";
  }

  return {
    boxNumber: parsed,
    observations: trimmedObservations.length > 0 ? trimmedObservations : null,
  };
}
