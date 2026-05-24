import { describe, expect, it } from "vitest";
import { getEmployeesErrorMessage } from "@/lib/employees-api";
import { ApiError } from "@/types/auth";

describe("getEmployeesErrorMessage", () => {
  it("returns pending-review friendly message for conflicts", () => {
    const message = getEmployeesErrorMessage(
      new ApiError("employee has a pending review request", 409),
    );
    expect(message).toBe(
      "El empleado ya tiene una solicitud pendiente de aprobación.",
    );
  });
});
