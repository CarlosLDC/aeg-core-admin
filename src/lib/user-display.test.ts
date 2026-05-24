import { describe, expect, it } from "vitest";
import {
  initialsFromUserDisplay,
  resolveUserDisplayName,
} from "@/lib/user-display";

describe("resolveUserDisplayName", () => {
  it("prefers name over email and username", () => {
    expect(
      resolveUserDisplayName({
        name: "María Pérez",
        email: "maria@aeg.local",
        username: "maria@aeg.local",
      }),
    ).toBe("María Pérez");
  });

  it("falls back to email when name is missing", () => {
    expect(
      resolveUserDisplayName({
        name: "",
        email: "admin@aeg.local",
        username: "admin@aeg.local",
      }),
    ).toBe("admin@aeg.local");
  });
});

describe("initialsFromUserDisplay", () => {
  it("uses initials from a full name", () => {
    expect(
      initialsFromUserDisplay({
        name: "María Pérez",
        email: "maria@aeg.local",
      }),
    ).toBe("MP");
  });

  it("uses email initials when name is missing", () => {
    expect(
      initialsFromUserDisplay({
        email: "admin@example.com",
      }),
    ).toBe("AE");
  });
});
