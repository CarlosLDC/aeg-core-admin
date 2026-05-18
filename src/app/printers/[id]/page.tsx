import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterView } from "@/components/printers/printer-view";

export default function PrinterDetailPage() {
  return (
    <AdminShell title="Impresora" description="Detalle de impresora fiscal">
      <RoleGuard path="/printers">
        <PrinterView />
      </RoleGuard>
    </AdminShell>
  );
}
