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
  it("allows technician detail routes", () => {
    expect(resolveNotificationHref("TECHNICIAN", "/branches/99")).toBe(
      "/branches/99",
    );
    expect(resolveNotificationHref("TECHNICIAN", "/printers/12")).toBe(
      "/printers/12",
    );
  });

  it("links technician branch notifications to branch detail", () => {
    expect(
      notificationHrefForBranch(branch, "TECHNICIAN", [client]),
    ).toBe("/branches/99");
  });

  it("links company notifications to an accessible branch detail", () => {
    expect(
      notificationHrefForCompany(10, "ADMIN", [branch], []),
    ).toBe("/branches/99");
    expect(
      notificationHrefForCompany(10, "TECHNICIAN", [branch], [client]),
    ).toBe("/branches/99");
  });
});
