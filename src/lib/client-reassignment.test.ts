import { describe, expect, it } from "vitest";
import {
  CLIENT_REASSIGNMENT_ERROR_TOKEN,
  isClientReassignmentRequiredError,
} from "./client-reassignment";

describe("isClientReassignmentRequiredError", () => {
  it("detects the dedicated error token", () => {
    expect(
      isClientReassignmentRequiredError(new Error(CLIENT_REASSIGNMENT_ERROR_TOKEN)),
    ).toBe(true);
  });

  it("detects backend reassignment messages", () => {
    expect(
      isClientReassignmentRequiredError(
        new Error("branch requires administrator reassignment"),
      ),
    ).toBe(true);
    expect(
      isClientReassignmentRequiredError(
        new Error("Branch already assigned to another distributor"),
      ),
    ).toBe(true);
  });
});
