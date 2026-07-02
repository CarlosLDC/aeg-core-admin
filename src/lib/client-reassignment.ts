import type { ConfirmDialogOptions } from "@/components/ui/confirm-dialog";

export const CLIENT_REASSIGNMENT_ERROR_TOKEN =
  "branch requires administrator reassignment";

export const CLIENT_REASSIGNMENT_MODAL = {
  title: "No podemos agregar esta empresa",
  message:
    "Esta empresa ya está vinculada a otra distribuidora o funciona como centro de servicio. " +
    "Si necesitas atenderla desde tu empresa, contacta a un administrador para que la reasigne.",
} as const;

export class ClientReassignmentRequiredError extends Error {
  constructor() {
    super(CLIENT_REASSIGNMENT_ERROR_TOKEN);
    this.name = "ClientReassignmentRequiredError";
  }
}

export function isClientReassignmentRequiredError(error: unknown): boolean {
  if (error instanceof ClientReassignmentRequiredError) {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();
  return (
    lower.includes("administrator reassignment") ||
    lower.includes("branch already assigned to another distributor") ||
    lower.includes("branch already linked to another distributor") ||
    lower.includes("ya es cliente de otra distribuidora")
  );
}

export function clientReassignmentModalOptions(): ConfirmDialogOptions {
  return {
    title: CLIENT_REASSIGNMENT_MODAL.title,
    message: CLIENT_REASSIGNMENT_MODAL.message,
    confirmLabel: "Entendido",
    alert: true,
  };
}

export async function showClientReassignmentModal(
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>,
): Promise<void> {
  await confirm(clientReassignmentModalOptions());
}
