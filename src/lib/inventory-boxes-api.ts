import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  InventoryBoxRequest,
  InventoryBoxResponse,
} from "@/types/inventory-box";

const BASE = "/api/inventory-boxes";

export async function fetchInventoryBoxes(): Promise<InventoryBoxResponse[]> {
  return apiFetch<InventoryBoxResponse[]>(BASE);
}

export async function fetchInventoryBoxById(
  id: number,
): Promise<InventoryBoxResponse> {
  return apiFetch<InventoryBoxResponse>(`${BASE}/${id}`);
}

export async function createInventoryBox(
  body: InventoryBoxRequest,
): Promise<InventoryBoxResponse> {
  return apiFetch<InventoryBoxResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateInventoryBox(
  id: number,
  body: InventoryBoxRequest,
): Promise<InventoryBoxResponse> {
  return apiFetch<InventoryBoxResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteInventoryBox(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getInventoryBoxesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return (
        error.message ||
        "No tienes permiso para acceder a esta caja de inventario."
      );
    }
    if (error.status === 404) {
      return "Caja de inventario no encontrada.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
