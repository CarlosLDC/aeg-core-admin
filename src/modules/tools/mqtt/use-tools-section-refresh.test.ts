import { describe, expect, it, vi } from "vitest";
import { runToolsSectionRefresh } from "./use-tools-section-refresh";

describe("runToolsSectionRefresh", () => {
  it("ejecuta estado y luego recarga de sección", async () => {
    const calls: string[] = [];
    const refreshStatus = vi.fn(async () => {
      calls.push("status");
    });
    const reloadSection = vi.fn(async () => {
      calls.push("section");
    });

    await runToolsSectionRefresh(refreshStatus, reloadSection);

    expect(refreshStatus).toHaveBeenCalledTimes(1);
    expect(reloadSection).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["status", "section"]);
  });
});
