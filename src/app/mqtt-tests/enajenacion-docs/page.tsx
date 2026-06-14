import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { EnajenacionMqttDocsPanel } from "@/components/mqtt/enajenacion-mqtt-docs-panel";

export default function EnajenacionMqttDocsPage() {
  return (
    <AdminShell
      title="Documentación — Enajenación MQTT"
      description="Referencia del protocolo fiscal automatizado entre impresora, broker y AEG Core"
    >
      <RoleGuard path="/mqtt-tests">
        <EnajenacionMqttDocsPanel showBackLink />
      </RoleGuard>
    </AdminShell>
  );
}
