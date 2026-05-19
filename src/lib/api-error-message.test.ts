import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/auth";
import {
  messageFromUnknownError,
  readErrorMessageFromResponse,
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

  it("maps binding property null to branch already registered", () => {
    expect(
      messageFromUnknownError(
        new ApiError("Binding property is null", 409),
      ),
    ).toMatch(/sucursal ya está registrada/i);
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
