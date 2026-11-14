import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CommercialPaymentsManager } from "@/components/commercial-payments/commercial-payments-manager";

export default function CommercialPaymentsPage() {
  return (
    <AdminShell
      title="Pagos comerciales"
      description="Registro de abonos, referencias bancarias y métodos de pago"
    >
      <RoleGuard path="/commercial-payments">
        <CommercialPaymentsManager />
      </RoleGuard>
    </AdminShell>
  );
}
