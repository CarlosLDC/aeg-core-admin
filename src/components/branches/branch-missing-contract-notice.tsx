import { FileText } from "lucide-react";
import { branchMissingContractMessage } from "@/lib/branch-contract-coverage";
import { cn } from "@/lib/utils";

type BranchMissingContractNoticeProps = {
  missingLabels: string[];
  /** @deprecated Los contratos se gestionan en la ficha de la empresa. */
  showContractsLink?: boolean;
  variant?: "banner" | "inline";
  className?: string;
};

export function BranchMissingContractNotice({
  missingLabels,
  variant = "banner",
  className,
}: BranchMissingContractNoticeProps) {
  const message = branchMissingContractMessage(missingLabels);
  if (!message) return null;

  if (variant === "inline") {
    return (
      <span
        role="status"
        title={message}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200",
          className,
        )}
      >
        <FileText className="size-3 shrink-0" aria-hidden />
        Sin contrato
      </span>
    );
  }

  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      <FileText className="size-4 shrink-0 opacity-80" aria-hidden />
      <span>
        {message} Regístralo en la pestaña Contrato.
      </span>
    </p>
  );
}
