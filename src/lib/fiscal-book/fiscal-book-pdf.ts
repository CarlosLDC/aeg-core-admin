import { jsPDF } from "jspdf";
import {
  getActiveSealSerial,
  truncateVersion,
} from "@/lib/fiscal-book/fiscal-helpers";
import type {
  FiscalAnnualInspection,
  FiscalPrinter,
  TechnicalReview,
} from "@/lib/fiscal-book/types";

type ViewMode = "info" | "tech" | "inspection";

export async function downloadFiscalBookPdf(
  printer: FiscalPrinter,
  viewMode: ViewMode,
  currentRecord: TechnicalReview | FiscalAnnualInspection | null,
): Promise<void> {
  if (viewMode !== "info" && !currentRecord) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const margin = 20;
  let y = 25;

  const drawHeader = () => {
    doc.setFillColor(245, 245, 245);
    doc.rect(margin - 5, y - 5, 190, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text("AEG", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("ALPHA ENGINEER GROUP, C.A.", margin, y + 5);
    doc.setFontSize(8);
    doc.text("RIF: J-40582910-3 | CONTROL FISCAL SENIAT 0141", margin, y + 10);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(150, y - 5, 40, 15, 1, 1, "FD");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("SERIAL FISCAL", 188, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(printer.fiscalSerial, 188, y + 6, { align: "right" });
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 15, 200 - margin, y + 15);
    y += 25;
  };

  const drawField = (label: string, value: string | null | undefined, x: number, py: number) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${label}: `, x, py);
    const v = value || "N/D";
    if (v === "N/D") doc.setFont("helvetica", "italic");
    doc.text(v, x + doc.getTextWidth(`${label}: `), py);
    doc.setFont("helvetica", "normal");
    return doc.getTextWidth(`${label}: ${v}`);
  };

  const section = (title: string) => {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }
    doc.setFillColor(250, 250, 250);
    doc.rect(margin - 2, y - 2, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
  };

  drawHeader();

  section("1. DATOS DEL FABRICANTE");
  doc.text("Razón Social: ALPHA ENGINEER GROUP, C.A.", margin, y);
  y += 6;
  doc.text("RIF: J504594369", margin, y);
  y += 10;

  section("2. DATOS DEL ENAJENADOR");
  if (printer.distributor?.branch) {
    const dist = printer.distributor.branch;
    drawField("Razón Social", dist.company.businessName, margin, y);
    y += 6;
    drawField("RIF", dist.company.rif, margin, y);
    y += 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Sin enajenador registrado.", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
  }
  y += 4;

  section("3. DATOS DEL CONTRIBUYENTE/USUARIO");
  drawField("Razón Social", printer.businessName, margin, y);
  y += 6;
  drawField("RIF", printer.rif, margin, y);
  y += 6;
  drawField("Domicilio Fiscal", printer.address, margin, y);
  y += 10;

  section("5. DATOS DE LA MÁQUINA FISCAL");
  doc.text(`Número de Registro (serial): ${printer.fiscalSerial}`, margin, y);
  y += 6;
  drawField("Marca", printer.model?.brand, margin, y);
  y += 6;
  drawField("Modelo", printer.model?.modelCode, margin, y);
  y += 6;
  doc.text(`Serial del Precinto: ${getActiveSealSerial(printer) ?? "N/D"}`, margin, y);
  y += 6;
  drawField("Versión del Firmware", truncateVersion(printer.versionFirmware), margin, y);
  y += 10;

  if (viewMode !== "info" && currentRecord) {
    doc.addPage();
    y = 25;
    drawHeader();

    if (viewMode === "tech") {
      const tr = currentRecord as TechnicalReview;
      section("1. DATOS DEL SERVICIO");
      drawField("Centro Autorizado", tr.serviceCenter, margin, y);
      y += 6;
      drawField("Fecha de Inicio", tr.startDate ?? tr.date, margin, y);
      y += 6;
      drawField("Fecha de Fin", tr.endDate, margin, y);
      y += 10;
      section("3. DETALLES DE LA INTERVENCIÓN");
      const description = (tr.description || "N/D").toUpperCase();
      const splitDesc = doc.splitTextToSize(description, 160);
      doc.text(splitDesc, margin, y);
    } else {
      const ai = currentRecord as FiscalAnnualInspection;
      section("1. DATOS DEL CENTRO Y TÉCNICO");
      drawField("Centro de Servicio", ai.serviceCenter, margin, y);
      y += 6;
      drawField("Fecha de Inspección", ai.date, margin, y);
      y += 6;
      drawField("Inspector Actuante", ai.inspector, margin, y);
      y += 10;
      section("2. DETALLES DE LA INSPECCIÓN");
      const observations = (ai.observations || "N/D").toUpperCase();
      const splitObs = doc.splitTextToSize(observations, 160);
      doc.text(splitObs, margin, y);
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Documento generado por Portal de Auditoría AEG - ${new Date().toLocaleString("es-VE")}`,
    105,
    275,
    { align: "center" },
  );

  doc.save(`${printer.fiscalSerial}-${Date.now()}.pdf`);
}
