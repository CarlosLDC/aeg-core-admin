import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CommercialInvoicesManager } from "@/components/commercial-invoices/commercial-invoices-manager";

export default function CommercialInvoicesPage() {
  return (
    <AdminShell
      title="Facturas comerciales"
      description="Control de facturación comercial, modalidad y estado de cobro"
    >
      <RoleGuard path="/commercial-invoices">
        <CommercialInvoicesManager />
      </RoleGuard>
    </AdminShell>
  );
}
