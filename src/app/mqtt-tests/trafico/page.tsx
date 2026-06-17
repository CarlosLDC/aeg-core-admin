import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { EnajenacionTrafficPanel } from "@/components/mqtt/enajenacion-traffic-panel";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function TrafficFallback() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" />
      Cargando…
    </div>
  );
}

export default function EnajenacionTrafficPage() {
  return (
    <AdminShell
      title="Tráfico MQTT — Enajenación"
      description="Tópicos y payloads del ritual fiscal para la impresora seleccionada"
    >
      <RoleGuard path="/mqtt-tests">
        <Suspense fallback={<TrafficFallback />}>
          <EnajenacionTrafficPanel />
        </Suspense>
      </RoleGuard>
    </AdminShell>
  );
}
