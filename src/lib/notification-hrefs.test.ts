import { describe, expect, it } from "vitest";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import {
  notificationHrefForBranch,
  notificationHrefForCompany,
  resolveNotificationHref,
} from "./notification-hrefs";

const branch: BranchResponse = {
  id: 99,
  companyId: 10,
  city: "Caracas",
  state: "DC",
  address: "Av 1",
  phone: "",
  email: "",
  createdAt: "",
};

const client: ClientResponse = {
  id: 7,
  branchId: 99,
  distributorId: 5,
  createdAt: "",
  reviewStatus: "ACTIVE",
};

describe("notification hrefs", () => {
  it("blocks service center technicians from panel notification routes", () => {
    expect(resolveNotificationHref("TECHNICIAN", "/branches/99")).toBeNull();
    expect(resolveNotificationHref("TECHNICIAN", "/printers/12")).toBeNull();
  });

  it("does not link technician branch notifications to panel routes", () => {
    expect(
      notificationHrefForBranch(branch, "TECHNICIAN", [client]),
    ).toBeNull();
  });

  it("links company notifications to an accessible branch detail for panel roles", () => {
    expect(
      notificationHrefForCompany(10, "ADMIN", [branch], []),
    ).toBe("/branches/99");
    expect(
      notificationHrefForCompany(10, "TECHNICIAN", [branch], [client]),
    ).toBeNull();
  });
});
