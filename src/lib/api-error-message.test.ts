import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/auth";
import {
  isReferentialIntegrityMessage,
  messageFromUnknownError,
  readErrorMessageFromResponse,
  toListErrorMessage,
  toToastErrorMessage,
} from "@/lib/api-error-message";

describe("readErrorMessageFromResponse", () => {
  it("reads JSON message", async () => {
    const res = new Response(JSON.stringify({ message: "RIF duplicado" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    await expect(readErrorMessageFromResponse(res)).resolves.toBe("RIF duplicado");
  });

  it("maps 403 to Spanish copy", async () => {
    const res = new Response("", { status: 403 });
    await expect(readErrorMessageFromResponse(res)).resolves.toBe(
      "No tienes permiso para realizar esta acción",
    );
  });
});

describe("messageFromUnknownError", () => {
  it("uses ApiError message", () => {
    expect(messageFromUnknownError(new ApiError("Prohibido", 403))).toBe(
      "Prohibido",
    );
  });

  it("maps binding property null to incomplete client link", () => {
    expect(
      messageFromUnknownError(
        new ApiError("Binding property is null", 409),
      ),
    ).toMatch(/reintentará completar el vínculo/i);
  });

  it("maps branch scope errors to Spanish", () => {
    expect(
      messageFromUnknownError(
        new ApiError("Not allowed to access branch id: 322", 403),
      ),
    ).toBe("No tienes permiso sobre esa sucursal.");
  });

  it("handles network TypeError", () => {
    expect(messageFromUnknownError(new TypeError("fetch failed"))).toBe(
      "No se pudo conectar con el servidor.",
    );
  });
});

describe("referential integrity messages", () => {
  const fullMessage =
    "No se puede realizar la operación porque el registro está siendo referenciado o hace referencia a un registro inexistente.";

  it("detects backend referential integrity copy", () => {
    expect(isReferentialIntegrityMessage(fullMessage)).toBe(true);
  });

  it("shortens toast copy", () => {
    expect(toToastErrorMessage(fullMessage)).toBe(
      "No se puede completar la operación por dependencias vinculadas.",
    );
  });

  it("keeps full copy on the table alert with record label", () => {
    expect(toListErrorMessage(fullMessage, "Impresora ABC1234567")).toBe(
      "No se puede eliminar «Impresora ABC1234567» porque está siendo referenciado o hace referencia a un registro inexistente.",
    );
  });

  it("passes through unrelated messages", () => {
    expect(toToastErrorMessage("Impresora no encontrada.")).toBe(
      "Impresora no encontrada.",
    );
  });
});
