import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CommercialPaymentView } from "@/components/commercial-payments/commercial-payment-view";

export default function CommercialPaymentDetailPage() {
  return (
    <AdminShell
      title="Pago comercial"
      description="Detalle de pago comercial y factura asociada"
    >
      <RoleGuard path="/commercial-payments">
        <CommercialPaymentView />
      </RoleGuard>
    </AdminShell>
  );
}
