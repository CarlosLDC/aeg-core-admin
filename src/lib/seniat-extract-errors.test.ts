import { describe, expect, it } from "vitest";
import {
  formatGeminiError,
  geminiErrorText,
  isGeminiOverloadError,
} from "./seniat-extract";

describe("formatGeminiError", () => {
  it("maps Gemini 503 high demand JSON to a friendly Spanish message", () => {
    const raw = JSON.stringify({
      error: {
        code: 503,
        message:
          "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        status: "UNAVAILABLE",
      },
    });
    const err = new Error(raw);
    expect(isGeminiOverloadError(err)).toBe(true);
    expect(formatGeminiError(err)).toMatch(/alta demanda/i);
    expect(formatGeminiError(err)).not.toContain("503");
    expect(formatGeminiError(err)).not.toContain("UNAVAILABLE");
  });

  it("does not surface raw JSON for unknown API errors", () => {
    const err = new Error('{"error":{"code":500,"message":"Internal"}}');
    const message = formatGeminiError(err);
    expect(message).not.toContain('"code"');
    expect(message).toMatch(/manualmente/i);
  });

  it("keeps short human-readable model messages", () => {
    const err = new Error(
      "El modelo no devolvió datos. Prueba con otra imagen más legible.",
    );
    expect(formatGeminiError(err)).toBe(err.message);
  });
});

describe("geminiErrorText", () => {
  it("extracts nested error message from JSON string", () => {
    const text = geminiErrorText(
      new Error(
        '{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}',
      ),
    );
    expect(text.toLowerCase()).toContain("high demand");
    expect(text).toContain("503");
  });
});
