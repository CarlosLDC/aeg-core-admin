import { describe, expect, it } from "vitest";
import {
  decodeToolsHeaderFooterText,
  parseToolsHeaderFooterContent,
  serializeToolsHeaderFooterLines,
  toolsHeaderFooterLinesEqual,
} from "./tools-header-footer-lines";

describe("tools-header-footer-lines", () => {
  it("parsea contenido vacío como una línea en blanco", () => {
    expect(parseToolsHeaderFooterContent("")).toEqual([""]);
    expect(parseToolsHeaderFooterContent(null)).toEqual([""]);
  });

  it("parsea saltos de línea Unix y Windows", () => {
    expect(parseToolsHeaderFooterContent("A\r\nB\nC")).toEqual(["A", "B", "C"]);
  });

  it("serializa líneas con salto Unix", () => {
    expect(serializeToolsHeaderFooterLines(["A", "B", ""])).toBe("A\nB\n");
  });

  it("compara listas de líneas por valor", () => {
    expect(toolsHeaderFooterLinesEqual(["A", "B"], ["A", "B"])).toBe(true);
    expect(toolsHeaderFooterLinesEqual(["A"], ["A", "B"])).toBe(false);
  });

  it("decodifica bytes Latin-2 embebidos en el contenido remoto", () => {
    const latinBytes = String.fromCharCode(0xed, 0xf1);
    expect(decodeToolsHeaderFooterText(latinBytes)).toBe("íñ");
    expect(parseToolsHeaderFooterContent(`Línea 1\n${latinBytes}`)).toEqual([
      "Línea 1",
      "íñ",
    ]);
  });
});
