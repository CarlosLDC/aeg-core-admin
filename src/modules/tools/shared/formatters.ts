import type { ToolsPrinter, ToolsPrinterLocationSource } from "@/modules/tools/shared/types";
import { isDistributorPanelRole, type Role } from "@/types/user";

export type StatusCssClass =
  | "status-active"
  | "status-maintenance"
  | "status-inactive"
  | "status-unassigned"
  | "status-enajenada"
  | "status-assigned";

const EMPTY_DATE_VALUES = new Set(["N/A", "null", "undefined", ""]);

export function getStatusClass(estado: string): StatusCssClass {
  const estadoLower = estado.toLowerCase();

  if (
    estadoLower.includes("activa") ||
    estadoLower.includes("online") ||
    estadoLower.includes("asignada")
  ) {
    return "status-active";
  }
  if (
    estadoLower.includes("mantenimiento") ||
    estadoLower.includes("maintenance")
  ) {
    return "status-maintenance";
  }
  if (
    estadoLower.includes("inactiva") ||
    estadoLower.includes("offline") ||
    estadoLower.includes("error")
  ) {
    return "status-inactive";
  }
  if (
    estadoLower.includes("sin asignar") ||
    estadoLower.includes("unassigned")
  ) {
    return "status-unassigned";
  }
  if (estadoLower.includes("enajenada")) {
    return "status-enajenada";
  }
  return "status-assigned";
}

export function formatDate(
  dateString: string | number | null | undefined,
): string {
  if (
    dateString === null ||
    dateString === undefined ||
    EMPTY_DATE_VALUES.has(String(dateString))
  ) {
    return "N/A";
  }

  try {
    const asString = String(dateString);

    if (!Number.isNaN(Number(asString)) && asString.length < 13) {
      const date = new Date(Number.parseInt(asString, 10) * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("es-ES");
      }
    }

    if (!Number.isNaN(Number(asString)) && asString.length >= 13) {
      const date = new Date(Number.parseInt(asString, 10));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("es-ES");
      }
    }

    if (typeof dateString === "string" && dateString.includes("-")) {
      const date = new Date(dateString);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("es-ES");
      }
    }

    if (typeof dateString === "string" && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const asDdMmYyyy = new Date(
          Number.parseInt(parts[2]!, 10),
          Number.parseInt(parts[1]!, 10) - 1,
          Number.parseInt(parts[0]!, 10),
        );
        if (!Number.isNaN(asDdMmYyyy.getTime())) {
          return asDdMmYyyy.toLocaleDateString("es-ES");
        }

        const asMmDdYyyy = new Date(
          Number.parseInt(parts[2]!, 10),
          Number.parseInt(parts[0]!, 10) - 1,
          Number.parseInt(parts[1]!, 10),
        );
        if (!Number.isNaN(asMmDdYyyy.getTime())) {
          return asMmDdYyyy.toLocaleDateString("es-ES");
        }
      }
    }

    return "N/A";
  } catch {
    return "N/A";
  }
}

export function extractLocation(source: ToolsPrinterLocationSource): string {
  if (source.ubicacion?.trim()) {
    return source.ubicacion.trim();
  }
  if (source.branchState?.trim()) {
    return source.branchState.trim();
  }
  if (source.branchCity?.trim()) {
    return source.branchCity.trim();
  }
  if (source.branchAddress?.trim()) {
    return source.branchAddress.trim();
  }
  if (source.stateInstall?.trim()) {
    return source.stateInstall.trim();
  }
  if (source.provinceInstall?.trim()) {
    return source.provinceInstall.trim();
  }
  if (source.addressInstall?.trim()) {
    return source.addressInstall.trim();
  }
  return "N/A";
}

export function toolsRoleTerminologyKey(role: Role): string {
  return isDistributorPanelRole(role) ? "distribuidor" : "admin";
}

export function adaptStatusTerminology(estado: string, userRole: string): string {
  if (userRole === "distribuidor" || userRole === "proveedor") {
    const lower = estado.toLowerCase();
    if (
      !lower.includes("enajenada") &&
      !lower.includes("consignacion") &&
      !lower.includes("consignación")
    ) {
      return "No Enajenada";
    }
  }
  return estado;
}

export type PrinterStatusCounts = {
  enajenadas: number;
  noEnajenadas: number;
  enConsignacion: number;
  sinAsignar: number;
};

export function countPrintersByStatus(
  printers: Array<{ estado?: string }>,
): PrinterStatusCounts {
  const counts: PrinterStatusCounts = {
    enajenadas: 0,
    noEnajenadas: 0,
    enConsignacion: 0,
    sinAsignar: 0,
  };

  for (const printer of printers) {
    const estado = (printer.estado || "").toLowerCase();
    if (estado.includes("enajenada")) {
      counts.enajenadas++;
    } else if (
      estado.includes("consignacion") ||
      estado.includes("consignación")
    ) {
      counts.enConsignacion++;
    } else if (
      estado.includes("sin asignar") ||
      estado.includes("unassigned") ||
      estado.includes("disponible")
    ) {
      counts.sinAsignar++;
    } else {
      counts.noEnajenadas++;
    }
  }

  return counts;
}

export type ToolsStatusBucket =
  | "all"
  | "enajenada"
  | "en_consignacion"
  | "sin_asignar"
  | "no_enajenada";

export function filterToolsPrintersByStatus(
  printers: ToolsPrinter[],
  filter: ToolsStatusBucket,
): ToolsPrinter[] {
  if (filter === "all") return printers;

  return printers.filter((printer) => {
    if (filter === "enajenada") return printer.status === "enajenada";
    if (filter === "en_consignacion") return printer.status === "en_consignacion";
    if (filter === "sin_asignar") return printer.status === "sin_asignar";
    return !["enajenada", "en_consignacion", "sin_asignar"].includes(
      printer.status,
    );
  });
}

export function filterPrinters(
  printers: ToolsPrinter[],
  searchTerm: string,
): ToolsPrinter[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [...printers];

  return printers.filter((printer) => {
    const haystack = [
      printer.serial,
      printer.macAddress ?? "",
      printer.modelo,
      printer.marca,
      printer.estado,
      printer.firmware,
      printer.ubicacion,
      printer.ciudad,
      printer.rifCliente,
      printer.rifName,
      printer.distributorName,
      printer.distributorRif,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}
