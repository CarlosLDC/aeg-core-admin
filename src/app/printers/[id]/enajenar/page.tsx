import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterDispositionView } from "@/components/printers/printer-disposition-view";

export default function PrinterDispositionPage() {
  return (
    <AdminShell
      title="Enajenar impresora"
      description="Factura virtual de enajenación"
    >
      <RoleGuard path="/printers">
        <Suspense fallback={null}>
          <PrinterDispositionView />
        </Suspense>
      </RoleGuard>
    </AdminShell>
  );
}
