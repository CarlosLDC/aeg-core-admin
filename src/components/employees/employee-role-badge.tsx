import {
  EMPLOYEE_UI_ROLE_LABELS,
  EMPLOYEE_UI_ROLE_STYLES,
  resolveEmployeeUiRole,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import { cn } from "@/lib/utils";

export function EmployeeRoleBadge({ employee }: { employee: EmployeeWithRoles }) {
  const role = resolveEmployeeUiRole(employee);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        EMPLOYEE_UI_ROLE_STYLES[role],
      )}
    >
      {EMPLOYEE_UI_ROLE_LABELS[role]}
    </span>
  );
}
