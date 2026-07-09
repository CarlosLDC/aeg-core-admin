"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrinterSubPage } from "@/components/tools/tools-printer-sub-page";
import { toolsPageTitle } from "@/lib/tools-page-titles";
import type { ToolsPrinter } from "@/modules/tools/shared/types";

type ToolsPrinterOperationPageProps = {
  children: (printer: ToolsPrinter) => React.ReactNode;
};

export function ToolsPrinterOperationPage({
  children,
}: ToolsPrinterOperationPageProps) {
  const params = useParams();
  const serial =
    typeof params.serial === "string" ? decodeURIComponent(params.serial) : "";

  return (
    <AdminShell title={toolsPageTitle(serial || undefined)}>
      <RoleGuard path="/tools">
        <ToolsPrinterSubPage>{children}</ToolsPrinterSubPage>
      </RoleGuard>
    </AdminShell>
  );
}
