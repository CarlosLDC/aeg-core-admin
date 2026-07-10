import { describe, expect, it, vi } from "vitest";
import { runToolsSectionRefresh } from "./use-tools-section-refresh";

describe("runToolsSectionRefresh", () => {
  it("ejecuta estado y recarga de sección en paralelo", async () => {
    const refreshStatus = vi.fn(async () => {});
    const reloadSection = vi.fn(async () => {});

    await runToolsSectionRefresh(refreshStatus, reloadSection);

    expect(refreshStatus).toHaveBeenCalledTimes(1);
    expect(reloadSection).toHaveBeenCalledTimes(1);
  });
});
