import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  fetchPrinterLogs,
  deletePrinterLogs,
  getPrinterLogsErrorMessage,
} from "./printer-logs-api";
import { ApiError } from "@/types/auth";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("printer-logs-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats query parameters correctly when fetching logs", async () => {
    const mockResponse = {
      printerId: 10,
      mac: "206EF1884C68",
      total: 1,
      page: 0,
      limit: 50,
      logs: [],
    };

    vi.mocked(api.apiFetch).mockResolvedValue(mockResponse);

    const result = await fetchPrinterLogs(10, {
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-27T23:59:59.000Z",
      q: "error",
      page: 1,
      limit: 25,
      order: "asc",
    });

    expect(api.apiFetch).toHaveBeenCalledWith(
      "/api/printers/10/logs?from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-27T23%3A59%3A59.000Z&q=error&page=1&limit=25&order=asc",
    );
    expect(result).toEqual(mockResponse);
  });

  it("sends DELETE request with before parameter", async () => {
    const mockDeleteRes = {
      deletedCount: 15,
      message: "Se eliminaron 15 logs",
    };

    vi.mocked(api.apiFetch).mockResolvedValue(mockDeleteRes);

    const result = await deletePrinterLogs(10, {
      before: "2026-10-01T00:00:00.000Z",
    });

    expect(api.apiFetch).toHaveBeenCalledWith(
      "/api/printers/10/logs?before=2026-10-01T00%3A00%3A00.000Z",
      { method: "DELETE" },
    );
    expect(result.deletedCount).toBe(15);
  });

  it("formats error messages accurately", () => {
    expect(getPrinterLogsErrorMessage(new ApiError("No autorizado", 401))).toBe(
      "No autorizado",
    );
    expect(getPrinterLogsErrorMessage(new Error("Fallo de red"))).toBe(
      "Fallo de red",
    );
    expect(getPrinterLogsErrorMessage("algo raro")).toBe(
      "Error al procesar logs de la impresora.",
    );
  });
});
