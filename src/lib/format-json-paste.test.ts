import { describe, expect, it } from "vitest";
import { formatJsonText } from "@/lib/format-json-paste";

describe("formatJsonText", () => {
  it("pretty-prints a compact object", () => {
    expect(formatJsonText('{"a":1,"b":[2,3]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}',
    );
  });

  it("pretty-prints a compact array", () => {
    expect(formatJsonText('[{"x":1},{"y":2}]')).toBe(
      '[\n  {\n    "x": 1\n  },\n  {\n    "y": 2\n  }\n]',
    );
  });

  it("returns null for invalid JSON", () => {
    expect(formatJsonText("{ not json }")).toBeNull();
  });

  it("returns null for primitives", () => {
    expect(formatJsonText('"hello"')).toBeNull();
    expect(formatJsonText("42")).toBeNull();
  });
});
