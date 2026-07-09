"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterDetailPageClient } from "@/components/tools/tools-printer-detail-page-client";
import { toolsPageTitle } from "@/lib/tools-page-titles";

export default function ToolsPrinterDetailPage() {
  const params = useParams<{ serial: string }>();
  const serial = decodeURIComponent(params.serial ?? "");

  return (
    <AdminShell title={toolsPageTitle(serial || undefined)}>
      <RoleGuard path="/tools">
        <ToolsPrinterDetailPageClient />
      </RoleGuard>
    </AdminShell>
  );
}
