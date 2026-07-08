"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsFormasPagoPanel } from "@/components/tools/tools-formas-pago-panel";

export default function ToolsPrinterFormasPagoPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Formas de pago de la impresora fiscal."
    >
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage
          title="Formas de pago"
          description="Consultar y editar medios de pago"
        >
          {(printer) => <ToolsFormasPagoPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
