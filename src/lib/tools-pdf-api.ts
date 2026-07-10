import {
  buildToolsPdfFilename,
  getToolsPdfTypeLabel,
  type ToolsPdfDownloadRequest,
} from "@/modules/tools/pdf/tools-pdf";

export type ToolsDocumentPdfPreview = {
  pdfUrl: string;
  filename: string;
};

export async function createToolsDocumentPdfPreview(
  request: ToolsPdfDownloadRequest,
): Promise<ToolsDocumentPdfPreview> {
  const response = await fetch("/api/tools/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = "No se pudo generar el PDF del documento.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const label = request.documentType
    ? getToolsPdfTypeLabel(request.documentType)
    : request.title || "Documento";
  const serial = request.printerSerial || request.serial;
  const filename = buildToolsPdfFilename(label, serial, request.documentNumber);

  return {
    pdfUrl: URL.createObjectURL(blob),
    filename,
  };
}

export function revokeToolsDocumentPdfPreview(
  preview: ToolsDocumentPdfPreview | null,
): void {
  if (preview?.pdfUrl) {
    URL.revokeObjectURL(preview.pdfUrl);
  }
}
