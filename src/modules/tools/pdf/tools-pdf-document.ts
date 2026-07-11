import { createRequire } from "node:module";
import type PDFDocumentType from "pdfkit";

const require = createRequire(import.meta.url);

type PDFDocumentConstructor = typeof PDFDocumentType;

let pdfDocumentClass: PDFDocumentConstructor | null = null;

/** Loads pdfkit standalone at runtime so Turbopack does not bundle it. */
export function getPdfDocumentClass(): PDFDocumentConstructor {
  if (!pdfDocumentClass) {
    pdfDocumentClass = require(
      "pdfkit/js/pdfkit.standalone.js",
    ) as PDFDocumentConstructor;
  }
  return pdfDocumentClass;
}

export type PdfDocument = InstanceType<PDFDocumentConstructor>;
