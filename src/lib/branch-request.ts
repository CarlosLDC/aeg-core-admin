import type { BranchRequest } from "@/types/branch";
import type { BranchFormValues } from "@/components/branches/branch-form-dialog";

export function toBranchRequest(values: BranchFormValues): BranchRequest {
  return {
    companyId: Number(values.companyId),
    city: values.city.trim(),
    state: values.state.trim(),
    address: values.address.trim() || undefined,
    contactPersonName: values.contactPersonName.trim(),
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
  };
}
