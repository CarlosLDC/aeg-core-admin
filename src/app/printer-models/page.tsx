import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterModelsManager } from "@/components/printer-models/printer-models-manager";

export default function PrinterModelsPage() {
  return (
    <AdminShell
      title="Modelos fiscales"
      description="Catálogo de impresoras fiscales homologadas"
    >
      <RoleGuard path="/printer-models">
        <PrinterModelsManager />
      </RoleGuard>
    </AdminShell>
  );
}
