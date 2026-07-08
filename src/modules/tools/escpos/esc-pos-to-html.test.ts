import { describe, expect, it } from "vitest";
import { escPosToHtml, parseEscPos } from "@/modules/tools/escpos/esc-pos-to-html";

describe("escPosToHtml", () => {
  it("parses centered title markers", () => {
    const lines = parseEscPos("!a1!TITULO DE PRUEBA");
    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("TITULO DE PRUEBA");
    expect(lines[0]?.align).toBe("center");
  });

  it("renders raw content to html container", () => {
    const html = escPosToHtml("FACTURA # 00001");
    expect(html).toContain("escpos-container");
    expect(html).toContain("00001");
  });
});
