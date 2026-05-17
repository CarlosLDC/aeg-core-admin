import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_STYLES,
  contractStatus,
} from "@/lib/contract-form";
import { cn } from "@/lib/utils";

export function ContractStatusBadge({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const status = contractStatus(startDate, endDate);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        CONTRACT_STATUS_STYLES[status],
      )}
    >
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  );
}
