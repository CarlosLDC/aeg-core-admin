import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchEmployeeRoleTables,
  syncEmployeeRoles,
} from "./employee-roles";
import type { Role } from "@/types/user";

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

describe("fetchEmployeeRoleTables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("skips technicians list for distributors", async () => {
    vi.mocked(fetchDistributorPersons).mockResolvedValue([]);
    const tables = await fetchEmployeeRoleTables("DISTRIBUTOR" as Role);
    expect(fetchTechnicians).not.toHaveBeenCalled();
    expect(tables.technicians).toEqual([]);
  });
});

describe("syncEmployeeRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
