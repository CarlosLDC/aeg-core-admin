"use client";

import { useMemo } from "react";
import { FlaskConical } from "lucide-react";
import { unpackMonochromeBitmap, base64ToBytes } from "@/lib/tools-logo-bitmap";
import { DEFAULT_TICKET_LINE_STYLE } from "@/lib/tools-ticket-style";
import { cn } from "@/lib/utils";
import type {
  ToolsTicketAlign,
  ToolsTicketLineStyle,
  ToolsTicketLogo,
} from "@/types/tools-customization";

/** Aviso visible mientras el cliente de personalización use datos simulados. */
export function ToolsSimulatedDataNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Vista previa con datos simulados.</span>{" "}
        El firmware todavía no soporta estos comandos: los cambios se guardan solo en
        este navegador y no se envían a la impresora.
      </p>
    </div>
  );
}

/** Dibuja un raster 1bpp en un data URL PNG (solo navegador). */
export function logoToDataUrl(logo: Pick<ToolsTicketLogo, "ancho" | "alto" | "datos">): string | null {
  if (typeof document === "undefined") return null;
  const bitmap = unpackMonochromeBitmap(base64ToBytes(logo.datos), logo.ancho, logo.alto);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(bitmap.width, bitmap.height);
  for (let i = 0; i < bitmap.pixels.length; i++) {
    const value = bitmap.pixels[i] ? 0 : 255;
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

const alignClass: Record<ToolsTicketAlign, string> = {
  L: "text-left justify-start",
  C: "text-center justify-center",
  R: "text-right justify-end",
};

const BASE_FONT_PX = 12;
const LINE_HEIGHT = 1.35;

function StyledTicketLine({ text, style }: { text: string; style: ToolsTicketLineStyle }) {
  // El ancho se emula con el tamaño de fuente (afecta al layout y la alineación);
  // el alto se ajusta con scaleY para que la proporción sea la de la impresora.
  const fontSize = BASE_FONT_PX * style.ancho;
  const scaleY = style.alto / style.ancho;
  return (
    <div
      className={cn("overflow-hidden whitespace-pre", alignClass[style.alin])}
      style={{ height: BASE_FONT_PX * LINE_HEIGHT * style.alto }}
    >
      <span
        className="inline-block origin-top"
        style={{
          fontSize,
          lineHeight: `${BASE_FONT_PX * LINE_HEIGHT * style.ancho}px`,
          transform: `scaleY(${scaleY})`,
          fontWeight: style.neg ? 700 : 400,
          textDecoration: style.sub ? "underline" : "none",
          textDecorationThickness: style.sub === 2 ? 2 : 1,
        }}
      >
        {text || " "}
      </span>
    </div>
  );
}

const FISCAL_BODY_SAMPLE = [
  "RIF: J-00000000-0",
  "FACTURA",
  "FACTURA:              00000123",
  "FECHA: 30-10-2026   HORA: 20:30",
  "----------------------------------------------",
  "PRODUCTO DE EJEMPLO (G)            Bs 100,00",
  "----------------------------------------------",
  "TOTAL                              Bs 116,00",
];

export function ToolsTicketPreview({
  logo,
  paperWidthPx,
  headerLines,
  headerStyles,
  footerLines,
  footerStyles,
}: {
  logo: Pick<ToolsTicketLogo, "ancho" | "alto" | "datos" | "activo" | "alin"> | null;
  paperWidthPx: number;
  headerLines: string[];
  headerStyles: ToolsTicketLineStyle[];
  footerLines: string[];
  footerStyles: ToolsTicketLineStyle[];
}) {
  const logoAncho = logo?.ancho;
  const logoAlto = logo?.alto;
  const logoDatos = logo?.datos;
  const logoUrl = useMemo(
    () =>
      logoAncho && logoAlto && logoDatos
        ? logoToDataUrl({ ancho: logoAncho, alto: logoAlto, datos: logoDatos })
        : null,
    [logoAncho, logoAlto, logoDatos],
  );

  return (
    <div className="rounded-xl border border-border bg-foreground/[0.03] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Vista previa del ticket
      </p>
      <div
        className="mx-auto bg-white px-3 py-4 font-mono text-black shadow-md"
        style={{ width: "calc(50ch + 1.5rem)", fontSize: BASE_FONT_PX }}
      >
        {logo && logo.activo && logoUrl ? (
          <div className={cn("mb-2 flex", alignClass[logo.alin])}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en cliente */}
            <img
              src={logoUrl}
              alt="Logo del ticket"
              style={{
                width: `${(logo.ancho / paperWidthPx) * 100}%`,
                imageRendering: "pixelated",
              }}
            />
          </div>
        ) : null}

        {headerLines.map((line, index) => (
          <StyledTicketLine
            key={`h-${index}`}
            text={line}
            style={headerStyles[index] ?? DEFAULT_TICKET_LINE_STYLE}
          />
        ))}

        <div className="my-2 select-none text-black/45" aria-label="Cuerpo fiscal de ejemplo">
          {FISCAL_BODY_SAMPLE.map((line) => (
            <div key={line} className="overflow-hidden whitespace-pre">
              {line}
            </div>
          ))}
        </div>

        {footerLines.map((line, index) => (
          <StyledTicketLine
            key={`f-${index}`}
            text={line}
            style={footerStyles[index] ?? DEFAULT_TICKET_LINE_STYLE}
          />
        ))}

        <div className="mt-2 text-center text-black/45">MH   Z1F0000000</div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        El cuerpo fiscal (gris) lo genera la impresora y no admite estilos.
      </p>
    </div>
  );
}
