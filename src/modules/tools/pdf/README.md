# Tools PDF

Generación de PDF a partir de contenido ESC/POS recibido por MQTT (tópico `Documento`).

- `tools-pdf-shared.ts` — tipos y nombres de archivo (cliente)
- `tools-pdf-server.ts` — pdfkit solo en servidor
- `POST /api/tools/pdf` — devuelve el PDF para vista previa o descarga
- `ToolsDocumentPdfModal` — modal con iframe y botón de descarga
