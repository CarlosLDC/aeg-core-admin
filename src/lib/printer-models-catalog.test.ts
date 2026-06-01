import { describe, expect, it, vi } from "vitest";
import {
  fetchMissingPrinterModels,
  missingPrinterModelIds,
} from "@/lib/printer-models-catalog";
import * as printerModelsApi from "@/lib/printer-models-api";
import type { PrinterModelResponse } from "@/types/printer-model";

const model = (id: number): PrinterModelResponse => ({
  id,
  brand: "Brand",
  modelCode: `M${id}`,
  price: 1,
  providencia: "",
  approvalDate: "",
  createdAt: "",
});

describe("missingPrinterModelIds", () => {
  it("returns ids referenced by printers but absent from catalog", () => {
    expect(
      missingPrinterModelIds([{ modelId: 1 }, { modelId: 2 }], [model(1)]),
    ).toEqual([2]);
  });
});

describe("fetchMissingPrinterModels", () => {
  it("fetches missing models by id and merges into catalog", async () => {
    vi.spyOn(printerModelsApi, "fetchPrinterModelById").mockImplementation(
      async (id) => model(id),
    );

    const result = await fetchMissingPrinterModels(
      [{ modelId: 2 }],
      [model(1)],
    );

    expect(result.map((m) => m.id).sort()).toEqual([1, 2]);
    vi.restoreAllMocks();
  });

  it("falls back to list when fetch by id fails (distributor scope)", async () => {
    vi.spyOn(printerModelsApi, "fetchPrinterModelById").mockRejectedValue(
      new Error("403"),
    );
    vi.spyOn(printerModelsApi, "fetchPrinterModels").mockResolvedValue([
      model(1),
      model(2),
    ]);

    const result = await fetchMissingPrinterModels(
      [{ modelId: 2 }],
      [model(1)],
    );

    expect(result.map((m) => m.id).sort()).toEqual([1, 2]);
    vi.restoreAllMocks();
  });
});
