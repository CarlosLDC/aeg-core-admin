import type { BranchFormValues } from "@/components/branches/branch-form-dialog";
import { normalizeStateName } from "@/lib/state-label";
import type { BranchRequest } from "@/types/branch";

export function toBranchRequest(values: BranchFormValues): BranchRequest {
  return {
    companyId: Number(values.companyId),
    city: values.city.trim(),
    state: normalizeStateName(values.state),
    address: values.address.trim() || undefined,
    contactPersonName: values.contactPersonName.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    isHeadquarters: values.isHeadquarters || undefined,
  };
}
