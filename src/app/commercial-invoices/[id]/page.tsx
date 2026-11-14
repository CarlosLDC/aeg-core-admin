import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CommercialInvoiceView } from "@/components/commercial-invoices/commercial-invoice-view";

export default function CommercialInvoiceDetailPage() {
  return (
    <AdminShell
      title="Factura comercial"
      description="Detalle de factura comercial y pagos asociados"
    >
      <RoleGuard path="/commercial-invoices">
        <CommercialInvoiceView />
      </RoleGuard>
    </AdminShell>
  );
}
