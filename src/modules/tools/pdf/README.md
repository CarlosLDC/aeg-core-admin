# Tools PDF

Generación de PDF a partir de contenido ESC/POS recibido por MQTT (tópico `Documento`).

- `tools-pdf.ts` — parser + pdfkit (ticket fiscal 80 mm)
- `POST /api/tools/pdf` — devuelve el PDF para vista previa o descarga
- `ToolsDocumentPdfModal` — modal con iframe y botón de descarga
