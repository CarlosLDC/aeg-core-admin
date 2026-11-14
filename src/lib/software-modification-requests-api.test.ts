import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createSoftwareModificationRequest,
  fetchSoftwareModificationRequests,
  fetchPendingSoftwareModificationRequest,
  fetchSoftwareModificationRequestById,
  approveSoftwareModificationRequest,
  rejectSoftwareModificationRequest,
  cancelSoftwareModificationRequest,
  getSoftwareModificationRequestsErrorMessage,
} from "@/lib/software-modification-requests-api";
import { ApiError } from "@/types/auth";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";

describe("software-modification-requests-api", () => {
  const mockApiFetch = vi.mocked(apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSoftwareModificationRequest calls POST /api/software-modification-requests", async () => {
    const payload = {
      printerId: 10,
      name: "Sistemas POS",
      version: "1.0.0",
    };
    mockApiFetch.mockResolvedValueOnce({ id: 1, ...payload });

    const result = await createSoftwareModificationRequest(payload);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/software-modification-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({ id: 1, ...payload });
  });

  it("fetchSoftwareModificationRequests calls GET with query param", async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    await fetchSoftwareModificationRequests("PENDING");
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/software-modification-requests?status=PENDING",
    );
  });

  it("fetchPendingSoftwareModificationRequest returns null on 204/404", async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError("No content", 204));
    const res = await fetchPendingSoftwareModificationRequest(5);
    expect(res).toBeNull();
  });

  it("approve, reject and cancel call respective endpoints", async () => {
    mockApiFetch.mockResolvedValue({ id: 2 });

    await approveSoftwareModificationRequest(2);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/software-modification-requests/2/approve",
      { method: "POST" },
    );

    await rejectSoftwareModificationRequest(2);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/software-modification-requests/2/reject",
      { method: "POST" },
    );

    await cancelSoftwareModificationRequest(2);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/software-modification-requests/2/cancel",
      { method: "POST" },
    );
  });

  it("getSoftwareModificationRequestsErrorMessage extracts error message", () => {
    const apiError = new ApiError("Software ya existe", 400);
    expect(getSoftwareModificationRequestsErrorMessage(apiError)).toBe(
      "Software ya existe",
    );

    const notFoundError = new ApiError("Not found", 404);
    expect(getSoftwareModificationRequestsErrorMessage(notFoundError)).toBe(
      "Solicitud no encontrada.",
    );

    const forbiddenError = new ApiError("Forbidden", 403);
    expect(getSoftwareModificationRequestsErrorMessage(forbiddenError)).toBe(
      "No tienes permisos para esta operación.",
    );

    const genericError = new Error("Connection failed");
    expect(getSoftwareModificationRequestsErrorMessage(genericError)).toBe(
      "Connection failed",
    );

    expect(getSoftwareModificationRequestsErrorMessage(null)).toBe(
      "Ocurrió un error inesperado al procesar la solicitud de software.",
    );
  });
});
