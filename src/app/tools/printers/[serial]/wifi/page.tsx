"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { ToolsWifiPanel } from "@/components/tools/tools-wifi-panel";

export default function ToolsPrinterWifiPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Configuración WiFi de impresoras dentro del espacio Tools."
    >
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage
          title="Configuración WiFi"
          description="Escanear redes y conectar la impresora"
        >
          {(printer) => <ToolsWifiPanel printer={printer} />}
        </ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
