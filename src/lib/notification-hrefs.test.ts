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
  it("denies distributor list routes but allows detail", () => {
    expect(resolveNotificationHref("DISTRIBUTOR", "/branches")).toBeNull();
    expect(resolveNotificationHref("DISTRIBUTOR", "/branches/99")).toBe(
      "/branches/99",
    );
    expect(resolveNotificationHref("DISTRIBUTOR", "/printers/12")).toBe(
      "/printers/12",
    );
  });

  it("links distributor branch notifications to client detail when available", () => {
    expect(
      notificationHrefForBranch(branch, "DISTRIBUTOR", [client]),
    ).toBe("/clients/7");
  });

  it("links company notifications to an accessible branch detail", () => {
    expect(
      notificationHrefForCompany(10, "ADMIN", [branch], []),
    ).toBe("/branches/99");
    expect(
      notificationHrefForCompany(10, "DISTRIBUTOR", [branch], [client]),
    ).toBe("/clients/7");
  });
});
