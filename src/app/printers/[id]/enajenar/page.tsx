import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterDispositionView } from "@/components/printers/printer-disposition-view";

export default function PrinterDispositionPage() {
  return (
    <AdminShell
      title="Enajenación de impresora"
      description="Revisión de encabezado y pie de ticket"
    >
      <RoleGuard path="/printers">
        <Suspense fallback={null}>
          <PrinterDispositionView />
        </Suspense>
      </RoleGuard>
    </AdminShell>
  );
}
