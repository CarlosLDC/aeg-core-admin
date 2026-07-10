import "server-only";

import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import {
  parseEscPos,
  type EscPosLine,
} from "@/modules/tools/escpos/esc-pos-to-html";
import type { ToolsPdfDownloadRequest } from "@/modules/tools/pdf/tools-pdf-shared";

const PAGE_WIDTH = 226.77;
const MARGIN = 5;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_SIZE_NORMAL = 7.5;
const FONT_SIZE_TITLE = 8.5;
const LINE_SPACING = 1.2;

export async function createToolsPdfBuffer(
  request: ToolsPdfDownloadRequest,
): Promise<Buffer> {
  const rawContent = request.rawContent || request.content || "";
  if (!rawContent) {
    throw new Error("Contenido del documento vacío");
  }

  const documentType = request.documentType || request.title?.toLowerCase();
  const printerSerial = request.printerSerial || request.serial;
  const parsedLines = parsePdfLines(rawContent, documentType, printerSerial);
  const pageHeight = Math.max(calculateContentHeight(parsedLines) + 40, 150);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, pageHeight],
        margins: {
          top: MARGIN,
          bottom: MARGIN,
          left: MARGIN,
          right: MARGIN,
        },
        autoFirstPage: true,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      renderPdf(doc, parsedLines);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function parsePdfLines(
  rawContent: string,
  documentType?: string,
  printerSerial?: string,
): EscPosLine[] {
  const parsedLines = parseEscPos(rawContent);
  const isNoFiscal =
    documentType === "NF" || documentType === "documento-no-fiscal";

  if (!isNoFiscal && printerSerial) {
    parsedLines.push({
      text: "",
      leftPart: "NO FISCAL",
      rightPart: printerSerial,
      align: "left",
      bold: false,
      isTitle: false,
      isSeparator: false,
    });
  }

  return parsedLines;
}

function calculateContentHeight(lines: EscPosLine[]): number {
  let y = MARGIN;
  for (const line of lines) {
    const fontSize = line.isTitle ? FONT_SIZE_TITLE : FONT_SIZE_NORMAL;
    if (line.isSeparator) y += 1;
    y += fontSize + LINE_SPACING;
    if (line.isSeparator) y += 1;
  }
  return y + MARGIN;
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function renderPdf(doc: PdfDoc, lines: EscPosLine[]): void {
  let y = MARGIN;

  for (const line of lines) {
    const fontSize = line.isTitle ? FONT_SIZE_TITLE : FONT_SIZE_NORMAL;
    const fontName = line.bold ? "Courier-Bold" : "Courier";

    if (line.isSeparator) y += 1;

    doc.font(fontName).fontSize(fontSize);

    if (line.isSeparator) {
      const charWidth = doc.widthOfString("-");
      const count = Math.floor(CONTENT_WIDTH / charWidth);
      doc.text("-".repeat(count), MARGIN, y, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    } else if (line.rightPart) {
      const leftText = (line.leftPart || line.text || "").trim();
      const rightText = line.rightPart;
      const rightWidth = doc.widthOfString(rightText);
      const gap = 4;
      const isProductLine = /^\([A-Z]\)\s+Bs\s*[\d.,]+/i.test(rightText);
      const maxDescWidth = isProductLine
        ? Math.floor(CONTENT_WIDTH * 0.5)
        : Math.max(20, CONTENT_WIDTH - rightWidth - gap);

      if (isProductLine && doc.widthOfString(leftText) > maxDescWidth) {
        const chunks = wrapTextToWidth(doc, leftText, maxDescWidth);
        for (let index = 0; index < chunks.length - 1; index += 1) {
          doc.text(chunks[index], MARGIN, y, { width: maxDescWidth });
          y += fontSize + LINE_SPACING;
        }
        const lastChunk = chunks[chunks.length - 1];
        doc.text(lastChunk, MARGIN, y, {
          width: CONTENT_WIDTH - rightWidth - gap,
        });
        doc.text(rightText, MARGIN + CONTENT_WIDTH - rightWidth, y, {
          width: rightWidth,
        });
      } else {
        doc.text(leftText, MARGIN, y, { width: maxDescWidth });
        doc.text(rightText, MARGIN + CONTENT_WIDTH - rightWidth, y, {
          width: rightWidth,
        });
      }
    } else {
      doc.text(line.text, MARGIN, y, {
        width: CONTENT_WIDTH,
        align: line.align,
      });
    }

    y += fontSize + LINE_SPACING;
    if (line.isSeparator) y += 1;
  }
}

function wrapTextToWidth(doc: PdfDoc, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (doc.widthOfString(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
