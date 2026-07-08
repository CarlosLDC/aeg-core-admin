import { describe, expect, it, vi } from "vitest";
import { runSerialBatch } from "@/lib/batch-create";

describe("runSerialBatch", () => {
  it("counts successes when all create", async () => {
    const createOne = vi.fn().mockResolvedValue({});
    const result = await runSerialBatch(["A", "B"], createOne);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(createOne).toHaveBeenCalledTimes(2);
    const batchId = createOne.mock.calls[0]?.[1];
    expect(batchId).toBeTruthy();
    expect(createOne.mock.calls[1]?.[1]).toBe(batchId);
  });

  it("collects failures without stopping the batch", async () => {
    const createOne = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("duplicado"))
      .mockResolvedValueOnce({});
    const result = await runSerialBatch(["S1", "S2", "S3"], createOne);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toEqual([{ serial: "S2", message: "duplicado" }]);
  });

  it("reports progress", async () => {
    const progress: number[] = [];
    await runSerialBatch(["X"], async () => {}, (p) => progress.push(p.done));
    expect(progress).toContain(0);
    expect(progress[progress.length - 1]).toBe(1);
  });
});
