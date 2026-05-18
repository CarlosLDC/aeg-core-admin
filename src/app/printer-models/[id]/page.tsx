import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterModelView } from "@/components/printer-models/printer-model-view";

export default function PrinterModelDetailPage() {
  return (
    <AdminShell title="Modelo fiscal" description="Detalle de modelo">
      <RoleGuard path="/printer-models">
        <PrinterModelView />
      </RoleGuard>
    </AdminShell>
  );
}
