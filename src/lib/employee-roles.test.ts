import { describe, expect, it, vi } from "vitest";
import { syncEmployeeRoles } from "./employee-roles";

vi.mock("@/lib/technicians-api", () => ({
  fetchTechnicians: vi.fn(),
  createTechnician: vi.fn(),
  deleteTechnician: vi.fn(),
}));

vi.mock("@/lib/distributor-persons-api", () => ({
  fetchDistributorPersons: vi.fn(),
  createDistributorPerson: vi.fn(),
  deleteDistributorPerson: vi.fn(),
}));

import {
  createDistributorPerson,
  fetchDistributorPersons,
} from "@/lib/distributor-persons-api";
import {
  createTechnician,
  fetchTechnicians,
} from "@/lib/technicians-api";

describe("syncEmployeeRoles", () => {
  it("does not fetch technicians when role is only administrativo", async () => {
    await syncEmployeeRoles(42, null, {
      isTechnician: false,
      isDistributorPerson: false,
    });
    expect(fetchTechnicians).not.toHaveBeenCalled();
    expect(createTechnician).not.toHaveBeenCalled();
    expect(fetchDistributorPersons).not.toHaveBeenCalled();
    expect(createDistributorPerson).not.toHaveBeenCalled();
  });

  it("creates distributor person without listing all persons", async () => {
    await syncEmployeeRoles(42, null, {
      isTechnician: false,
      isDistributorPerson: true,
    });
    expect(fetchDistributorPersons).not.toHaveBeenCalled();
    expect(createDistributorPerson).toHaveBeenCalledWith({ employeeId: 42 });
  });
});
