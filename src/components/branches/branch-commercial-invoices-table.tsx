"use client";

import { CompanyCommercialInvoicesTable } from "@/components/commercial-invoices/company-commercial-invoices-table";
import type { BranchWithRoles } from "@/types/branch";

type BranchCommercialInvoicesTableProps = {
  branch: BranchWithRoles;
};

export function BranchCommercialInvoicesTable({
  branch,
}: BranchCommercialInvoicesTableProps) {
  return (
    <CompanyCommercialInvoicesTable
      companyId={branch.companyId}
      storageKey={`branch-commercial-invoices-${branch.id}`}
    />
  );
}
