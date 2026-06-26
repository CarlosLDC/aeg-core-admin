import type {
  EnajenacionActivityEntry,
  EnajenacionActivityResult,
} from "@/types/mqtt";

export function activityResultLabel(result: EnajenacionActivityResult): string {
  switch (result) {
    case "RECEIVED":
      return "Recibido";
    case "PROCESSED":
      return "Procesado";
    case "PUBLISHED":
      return "Publicado";
    case "IGNORED":
      return "Ignorado";
    case "REJECTED":
      return "Rechazado";
    case "FAILED":
      return "Fallido";
    case "COMPLETED":
      return "Completado";
    default:
      return result;
  }
}

export function directionLabel(
  direction: EnajenacionActivityEntry["direction"],
): string {
  if (direction === "INBOUND") return "Entrada";
  if (direction === "OUTBOUND") return "Salida";
  return "Sesión";
}
