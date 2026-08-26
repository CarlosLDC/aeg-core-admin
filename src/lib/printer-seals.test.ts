import { describe, expect, it, vi } from "vitest";
import {
  createAndInstallSeal,
  getAvailableSeals,
  getPrinterSealsSummary,
  installSealOnPrinter,
  retireCurrentSeal,
  unlinkSealFromPrinter,
} from "./printer-seals";
import * as sealsApi from "./seals-api";
import type { SealResponse } from "@/types/seal";

describe("printer-seals", () => {
  const mockSeals: SealResponse[] = [
    {
      id: 1,
      printerId: 10,
      serial: "SEC-001",
      createdAt: "2026-01-01T10:00:00Z",
      installationDate: "2026-01-01T10:00:00Z",
      removalDate: "2026-02-01T10:00:00Z",
      color: "azul",
      status: "sustituido",
    },
    {
      id: 2,
      printerId: 10,
      serial: "SEC-002",
      createdAt: "2026-02-01T10:00:00Z",
      installationDate: "2026-02-01T10:00:00Z",
      removalDate: null,
      color: "verde",
      status: "en_impresora",
    },
    {
      id: 3,
      printerId: null,
      serial: "SEC-003",
      createdAt: "2026-02-05T10:00:00Z",
      installationDate: null,
      removalDate: null,
      color: "morado",
      status: "disponible",
    },
    {
      id: 4,
      printerId: 20,
      serial: "SEC-004",
      createdAt: "2026-02-10T10:00:00Z",
      installationDate: "2026-02-10T10:00:00Z",
      removalDate: null,
      color: "verde_neon",
      status: "en_impresora",
    },
  ];

  describe("getPrinterSealsSummary", () => {
    it("extracts active seal and historical seals for a printer", () => {
      const summary = getPrinterSealsSummary(mockSeals, 10);
      expect(summary.activeSeal?.id).toBe(2);
      expect(summary.activeSeal?.serial).toBe("SEC-002");
      expect(summary.historicalSeals).toHaveLength(1);
      expect(summary.historicalSeals[0]?.id).toBe(1);
      expect(summary.totalAssignedCount).toBe(2);
    });

    it("handles printer with no active seal", () => {
      const summary = getPrinterSealsSummary(mockSeals, 999);
      expect(summary.activeSeal).toBeNull();
      expect(summary.historicalSeals).toHaveLength(0);
      expect(summary.totalAssignedCount).toBe(0);
    });
  });

  describe("getAvailableSeals", () => {
    it("filters and sorts available seals", () => {
      const available = getAvailableSeals(mockSeals);
      expect(available).toHaveLength(1);
      expect(available[0]?.id).toBe(3);
      expect(available[0]?.serial).toBe("SEC-003");
    });
  });

  describe("installSealOnPrinter", () => {
    it("installs available seal and retires previous active seal", async () => {
      const updateSpy = vi.spyOn(sealsApi, "updateSeal").mockImplementation(async (_id, req) => ({
        id: _id,
        printerId: req.printerId ?? null,
        serial: req.serial,
        createdAt: "2026-01-01T00:00:00Z",
        installationDate: req.installationDate ?? null,
        removalDate: req.removalDate ?? null,
        color: req.color,
        status: req.status,
      }));

      const targetSeal = mockSeals[2]!; // id 3 (disponible)
      const previousActive = mockSeals[1]!; // id 2 (en_impresora)

      const result = await installSealOnPrinter({
        seal: targetSeal,
        printerId: 10,
        previousActiveSeal: previousActive,
        installationDate: "2026-03-01T12:00:00Z",
      });

      expect(updateSpy).toHaveBeenCalledTimes(2);
      // 1: previous seal retired
      expect(updateSpy).toHaveBeenNthCalledWith(1, 2, {
        printerId: 10,
        serial: "SEC-002",
        color: "verde",
        status: "sustituido",
        installationDate: "2026-02-01T10:00:00Z",
        removalDate: "2026-03-01T12:00:00.000Z",
        creationBatchId: undefined,
      });
      // 2: target seal installed
      expect(updateSpy).toHaveBeenNthCalledWith(2, 3, {
        printerId: 10,
        serial: "SEC-003",
        color: "morado",
        status: "en_impresora",
        installationDate: "2026-03-01T12:00:00.000Z",
        removalDate: null,
        creationBatchId: undefined,
      });

      expect(result.status).toBe("en_impresora");
      expect(result.printerId).toBe(10);

      updateSpy.mockRestore();
    });
  });

  describe("createAndInstallSeal", () => {
    it("creates a new seal and marks previous active seal as sustituido", async () => {
      const updateSpy = vi.spyOn(sealsApi, "updateSeal").mockResolvedValue({} as SealResponse);
      const createSpy = vi.spyOn(sealsApi, "createSeal").mockImplementation(async (req) => ({
        id: 99,
        printerId: req.printerId ?? null,
        serial: req.serial,
        createdAt: "2026-03-01T12:00:00Z",
        installationDate: req.installationDate ?? null,
        removalDate: null,
        color: req.color,
        status: req.status,
      }));

      const previousActive = mockSeals[1]!;

      const created = await createAndInstallSeal({
        serial: "SEC-NEW",
        color: "azul",
        printerId: 10,
        installationDate: "2026-03-01T12:00:00Z",
        previousActiveSeal: previousActive,
      });

      expect(updateSpy).toHaveBeenCalledWith(2, expect.objectContaining({
        status: "sustituido",
        removalDate: "2026-03-01T12:00:00.000Z",
      }));
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        serial: "SEC-NEW",
        color: "azul",
        printerId: 10,
        status: "en_impresora",
      }));
      expect(created.id).toBe(99);

      updateSpy.mockRestore();
      createSpy.mockRestore();
    });
  });

  describe("retireCurrentSeal", () => {
    it("sets status to sustituido and records removal date", async () => {
      const updateSpy = vi.spyOn(sealsApi, "updateSeal").mockImplementation(async (_id, req) => ({
        id: _id,
        printerId: req.printerId ?? null,
        serial: req.serial,
        createdAt: "2026-01-01T00:00:00Z",
        installationDate: req.installationDate ?? null,
        removalDate: req.removalDate ?? null,
        color: req.color,
        status: req.status,
      }));

      const activeSeal = mockSeals[1]!;
      const result = await retireCurrentSeal({
        seal: activeSeal,
        removalDate: "2026-03-01T15:00:00Z",
      });

      expect(updateSpy).toHaveBeenCalledWith(2, {
        printerId: 10,
        serial: "SEC-002",
        color: "verde",
        status: "sustituido",
        installationDate: "2026-02-01T10:00:00Z",
        removalDate: "2026-03-01T15:00:00.000Z",
        creationBatchId: undefined,
      });
      expect(result.status).toBe("sustituido");

      updateSpy.mockRestore();
    });
  });

  describe("unlinkSealFromPrinter", () => {
    it("sets status to disponible and clears printerId", async () => {
      const updateSpy = vi.spyOn(sealsApi, "updateSeal").mockImplementation(async (_id, req) => ({
        id: _id,
        printerId: req.printerId ?? null,
        serial: req.serial,
        createdAt: "2026-01-01T00:00:00Z",
        installationDate: req.installationDate ?? null,
        removalDate: req.removalDate ?? null,
        color: req.color,
        status: req.status,
      }));

      const activeSeal = mockSeals[1]!;
      const result = await unlinkSealFromPrinter({ seal: activeSeal });

      expect(updateSpy).toHaveBeenCalledWith(2, {
        printerId: null,
        serial: "SEC-002",
        color: "verde",
        status: "disponible",
        installationDate: null,
        removalDate: null,
        creationBatchId: undefined,
      });
      expect(result.status).toBe("disponible");
      expect(result.printerId).toBeNull();

      updateSpy.mockRestore();
    });
  });
});
