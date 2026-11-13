import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { InventoryBoxesManager } from "@/components/inventory-boxes/inventory-boxes-manager";

export default function InventoryBoxesPage() {
  return (
    <AdminShell
      title="Cajas de inventario"
      description="Control de cajas de empaque físico y asignación de impresoras fiscales"
    >
      <RoleGuard path="/inventory-boxes">
        <InventoryBoxesManager />
      </RoleGuard>
    </AdminShell>
  );
}
