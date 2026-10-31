"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImageUp,
  Loader2,
  Pencil,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import {
  ToolsActionButton,
  ToolsConnectionWarning,
  ToolsPage,
  ToolsPanelSection,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
} from "@/components/tools/tools-ui";
import { ToolsSimulatedDataNotice, ToolsTicketPreview } from "@/components/tools/tools-ticket-preview";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/context/toast-provider";
import {
  bytesToBase64,
  chunkCount,
  crc32Hex,
  fitLogoDimensions,
  grayscaleToMonochrome,
  LOGO_ACCEPTED_TYPES,
  LOGO_DEFAULT_MAX_HEIGHT,
  LOGO_DEFAULT_MAX_WIDTH,
  LOGO_MAX_FILE_BYTES,
  packMonochromeBitmap,
  rgbaToGrayscale,
  type LogoDitherMode,
} from "@/lib/tools-logo-bitmap";
import { toolsPrinterHeaderFooterPath } from "@/lib/resource-routes";
import {
  DEFAULT_TICKET_LINE_STYLE,
  maxCharsForStyle,
  normalizeLineStyles,
  validateStyledLines,
} from "@/lib/tools-ticket-style";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { cn } from "@/lib/utils";
import { useToolsCustomizationClient } from "@/modules/tools/customization/customization-client";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsSectionRefresh } from "@/modules/tools/mqtt/use-tools-section-refresh";
import { parseHeaderFooterLines } from "@/modules/tools/serial/tools-header-footer-payload";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsTransport } from "@/modules/tools/transport/tools-transport-provider";
import type {
  ToolsPrinterCapabilities,
  ToolsTicketAlign,
  ToolsTicketLineStyle,
  ToolsTicketLogo,
} from "@/types/tools-customization";

const SAMPLE_HEADER = ["MI COMERCIO, C.A.", "AV. PRINCIPAL, LOCAL 1", "CARACAS - VENEZUELA"];
const SAMPLE_FOOTER = ["GRACIAS POR SU COMPRA", "SIGUENOS EN REDES @MICOMERCIO"];

type SizeOption = "1x" | "alto" | "ancho" | "2x";

function sizeOf(style: ToolsTicketLineStyle): SizeOption {
  if (style.alto === 2 && style.ancho === 2) return "2x";
  if (style.alto === 2) return "alto";
  if (style.ancho === 2) return "ancho";
  return "1x";
}

function sizeToStyle(size: SizeOption): Pick<ToolsTicketLineStyle, "alto" | "ancho"> {
  switch (size) {
    case "2x":
      return { alto: 2, ancho: 2 };
    case "alto":
      return { alto: 2, ancho: 1 };
    case "ancho":
      return { alto: 1, ancho: 2 };
    default:
      return { alto: 1, ancho: 1 };
  }
}

const ALIGN_OPTIONS: { value: ToolsTicketAlign; label: React.ReactNode }[] = [
  { value: "L", label: <AlignLeft className="size-4" aria-label="Izquierda" /> },
  { value: "C", label: <AlignCenter className="size-4" aria-label="Centro" /> },
  { value: "R", label: <AlignRight className="size-4" aria-label="Derecha" /> },
];

const iconToggleClass = (active: boolean, disabled: boolean) =>
  cn(
    "inline-flex size-8 items-center justify-center rounded-lg border text-sm transition-colors",
    active
      ? "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300"
      : "border-border text-muted hover:bg-foreground/[0.04] hover:text-foreground",
    disabled && "cursor-not-allowed opacity-50",
  );

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

function processLogoImage(
  image: HTMLImageElement,
  options: { maxWidth: number; maxHeight: number; mode: LogoDitherMode; threshold: number; invert: boolean },
): Omit<ToolsTicketLogo, "activo" | "alin"> {
  const { width, height } = fitLogoDimensions(
    image.naturalWidth,
    image.naturalHeight,
    options.maxWidth,
    options.maxHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite procesar imágenes.");
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const mono = grayscaleToMonochrome(rgbaToGrayscale(data, width, height), width, height, {
    mode: options.mode,
    threshold: options.threshold,
    invert: options.invert,
  });
  const packed = packMonochromeBitmap(mono);
  return { ancho: width, alto: height, datos: bytesToBase64(packed), crc32: crc32Hex(packed) };
}

function LineStyleRow({
  index,
  text,
  style,
  disabled,
  onChange,
}: {
  index: number;
  text: string;
  style: ToolsTicketLineStyle;
  disabled: boolean;
  onChange: (style: ToolsTicketLineStyle) => void;
}) {
  const max = maxCharsForStyle(style);
  const tooLong = text.length > max;
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-xs font-semibold tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 truncate font-mono text-sm" title={text}>
          {text}
        </span>
        {tooLong ? (
          <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
            {text.length}/{max}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={style.neg}
          aria-label="Negrita"
          title="Negrita"
          disabled={disabled}
          className={iconToggleClass(style.neg, disabled)}
          onClick={() => onChange({ ...style, neg: !style.neg })}
        >
          <Bold className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={style.sub > 0}
          aria-label="Subrayado"
          title={style.sub === 2 ? "Subrayado doble" : style.sub === 1 ? "Subrayado" : "Sin subrayado"}
          disabled={disabled}
          className={iconToggleClass(style.sub > 0, disabled)}
          onClick={() => onChange({ ...style, sub: ((style.sub + 1) % 3) as 0 | 1 | 2 })}
        >
          <Underline className={cn("size-4", style.sub === 2 && "stroke-[3]")} aria-hidden />
        </button>
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <SegmentedToggle<SizeOption>
          value={sizeOf(style)}
          onChange={(size) => onChange({ ...style, ...sizeToStyle(size) })}
          disabled={disabled}
          ariaLabel={`Tamaño de la línea ${index + 1}`}
          className="gap-1"
          options={[
            { value: "1x", label: "Normal", tone: "violet" },
            { value: "alto", label: "2× alto", tone: "violet" },
            { value: "ancho", label: "2× ancho", tone: "violet" },
            { value: "2x", label: "2×", tone: "violet" },
          ]}
        />
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <SegmentedToggle<ToolsTicketAlign>
          value={style.alin}
          onChange={(alin) => onChange({ ...style, alin })}
          disabled={disabled}
          ariaLabel={`Alineación de la línea ${index + 1}`}
          className="gap-1"
          options={ALIGN_OPTIONS.map((option) => ({ ...option, tone: "violet" as const }))}
        />
      </div>
    </li>
  );
}

export function ToolsTicketCustomizationPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const transport = useToolsTransport();
  const client = useToolsCustomizationClient(printer.id);
  const section = TOOLS_SECTIONS.ticketCustomization;
  const {
    loading: statusLoading,
    refreshStatus,
    remoteActionsDisabled,
    connectionResolved,
    connectionIssue,
    mqttReady,
  } = useToolsPrinterConnection(printer.id, printer.macAddress);

  const actionsDisabled = client.simulated ? false : remoteActionsDisabled;

  const [capabilities, setCapabilities] = useState<ToolsPrinterCapabilities | null>(null);
  const [loading, setLoading] = useState(false);

  // Texto real del encabezado / pie (o ejemplo si no hay conexión).
  const [headerLines, setHeaderLines] = useState<string[]>([]);
  const [footerLines, setFooterLines] = useState<string[]>([]);
  const [usingSampleText, setUsingSampleText] = useState(false);

  // Estilos
  const [baselineStyles, setBaselineStyles] = useState<{ enc: ToolsTicketLineStyle[]; pie: ToolsTicketLineStyle[] }>({ enc: [], pie: [] });
  const [headerStyles, setHeaderStyles] = useState<ToolsTicketLineStyle[]>([]);
  const [footerStyles, setFooterStyles] = useState<ToolsTicketLineStyle[]>([]);
  const [savingStyles, setSavingStyles] = useState(false);

  // Logo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedLogo, setSavedLogo] = useState<ToolsTicketLogo | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [ditherMode, setDitherMode] = useState<LogoDitherMode>("floyd-steinberg");
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [maxWidth, setMaxWidth] = useState(LOGO_DEFAULT_MAX_WIDTH);
  const [logoActivo, setLogoActivo] = useState(true);
  const [logoAlin, setLogoAlin] = useState<ToolsTicketAlign>("C");
  const [logoProgress, setLogoProgress] = useState<{ sent: number; total: number } | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const paperWidth = capabilities?.anchoPapelPx ?? LOGO_DEFAULT_MAX_WIDTH;
  const maxHeight = capabilities?.logoMaxAlto ?? LOGO_DEFAULT_MAX_HEIGHT;

  const pendingLogo = useMemo(() => {
    if (!sourceImage) return null;
    try {
      return processLogoImage(sourceImage, { maxWidth, maxHeight, mode: ditherMode, threshold, invert });
    } catch {
      return null;
    }
  }, [sourceImage, maxWidth, maxHeight, ditherMode, threshold, invert]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [caps, styles, logo] = await Promise.all([
        client.readCapabilities(),
        client.readTicketStyles(),
        client.readLogo(),
      ]);
      setCapabilities(caps);
      setMaxWidth((current) => Math.min(current, caps.anchoPapelPx));
      setBaselineStyles(styles);
      setSavedLogo(logo);
      if (logo) {
        setLogoActivo(logo.activo);
        setLogoAlin(logo.alin);
      }

      let enc: string[] = SAMPLE_HEADER;
      let pie: string[] = SAMPLE_FOOTER;
      let sample = true;
      if (!remoteActionsDisabled) {
        try {
          const [header, footer] = await Promise.all([transport.readHeader(), transport.readFooter()]);
          enc = parseHeaderFooterLines(header.content);
          pie = parseHeaderFooterLines(footer.content);
          sample = false;
        } catch {
          /* sin conexión: se usan líneas de ejemplo */
        }
      }
      setHeaderLines(enc);
      setFooterLines(pie);
      setUsingSampleText(sample);
      setHeaderStyles(normalizeLineStyles(styles.enc, enc.length));
      setFooterStyles(normalizeLineStyles(styles.pie, pie.length));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la personalización.");
    } finally {
      setLoading(false);
    }
  }, [client, transport, remoteActionsDisabled, toast]);

  const { refreshAll, refreshLoading } = useToolsSectionRefresh(refreshStatus, load, statusLoading);

  // `load` cambia cuando se resuelve la conexión: se vuelve a leer el texto real del equipo.
  useEffect(() => {
    void (async () => {
      await load();
      await refreshStatus();
    })();
  }, [load, refreshStatus]);

  const stylesDirty = useMemo(
    () =>
      JSON.stringify(headerStyles) !==
        JSON.stringify(normalizeLineStyles(baselineStyles.enc, headerLines.length)) ||
      JSON.stringify(footerStyles) !==
        JSON.stringify(normalizeLineStyles(baselineStyles.pie, footerLines.length)),
    [headerStyles, footerStyles, baselineStyles, headerLines.length, footerLines.length],
  );

  const revertStyles = () => {
    setHeaderStyles(normalizeLineStyles(baselineStyles.enc, headerLines.length));
    setFooterStyles(normalizeLineStyles(baselineStyles.pie, footerLines.length));
  };

  const saveStyles = async () => {
    const error =
      validateStyledLines(headerLines, headerStyles, "encabezado") ??
      validateStyledLines(footerLines, footerStyles, "pie");
    if (error) {
      toast.error(error);
      return;
    }
    setSavingStyles(true);
    try {
      const next = { enc: headerStyles, pie: footerStyles };
      const result = await client.writeTicketStyles(next);
      if (result.success) {
        setBaselineStyles(next);
        toast.success(result.message);
      } else toast.error(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar los estilos.");
    } finally {
      setSavingStyles(false);
    }
  };

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato no soportado. Use PNG, JPG, BMP o WebP.");
      return;
    }
    if (file.size > LOGO_MAX_FILE_BYTES) {
      toast.error("La imagen supera los 2 MB.");
      return;
    }
    try {
      setSourceImage(await loadImage(file));
      setSourceName(file.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen.");
    }
  };

  const sendLogo = async () => {
    if (!pendingLogo) return;
    setLogoBusy(true);
    setLogoProgress({ sent: 0, total: chunkCount(pendingLogo.ancho / 8 * pendingLogo.alto) });
    try {
      const logo: ToolsTicketLogo = { ...pendingLogo, activo: logoActivo, alin: logoAlin };
      const result = await client.writeLogo(logo, (sent, total) => setLogoProgress({ sent, total }));
      if (result.success) {
        setSavedLogo(logo);
        setSourceImage(null);
        setSourceName("");
        toast.success(result.message);
      } else toast.error(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el logo.");
    } finally {
      setLogoBusy(false);
      setLogoProgress(null);
    }
  };

  const saveLogoSettings = async () => {
    setLogoBusy(true);
    try {
      const result = await client.updateLogoSettings({ activo: logoActivo, alin: logoAlin });
      if (result.success) {
        setSavedLogo((current) => (current ? { ...current, activo: logoActivo, alin: logoAlin } : current));
        toast.success(result.message);
      } else toast.error(result.message);
    } finally {
      setLogoBusy(false);
    }
  };

  const deleteLogo = async () => {
    setLogoBusy(true);
    try {
      const result = await client.deleteLogo();
      if (result.success) {
        setSavedLogo(null);
        toast.success(result.message);
      } else toast.error(result.message);
    } finally {
      setLogoBusy(false);
    }
  };

  const previewLogo = pendingLogo
    ? { ...pendingLogo, activo: logoActivo, alin: logoAlin }
    : savedLogo
      ? { ...savedLogo, activo: logoActivo, alin: logoAlin }
      : null;
  const logoSettingsDirty =
    !pendingLogo && savedLogo != null && (savedLogo.activo !== logoActivo || savedLogo.alin !== logoAlin);
  const busy = loading || actionsDisabled;
  const logoBytes = pendingLogo ? (pendingLogo.ancho / 8) * pendingLogo.alto : 0;

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
          actions={
            <ToolsSectionStatusActions
              statusRefresh={{ loading: refreshLoading, refreshStatus: refreshAll, mqttReady }}
            />
          }
        />

        {client.simulated ? <ToolsSimulatedDataNotice /> : null}

        {connectionResolved && connectionIssue !== "none" && connectionIssue !== "legacy-broker" ? (
          <ToolsConnectionWarning variant={connectionIssue} />
        ) : null}

        {loading && !capabilities ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Leyendo personalización del ticket…
          </div>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-4">
              {/* ---------- Logo ---------- */}
              <ToolsPanelSection
                title="Logo"
                description={`Imagen en blanco y negro impresa sobre el encabezado. Máximo ${paperWidth} × ${maxHeight} puntos.`}
                icon={ImageUp}
                tone="violet"
                headerActions={
                  <div className="flex flex-wrap gap-2">
                    <ToolsActionButton
                      disabled={busy || logoBusy || capabilities?.logo === false}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageUp className="size-4" aria-hidden />
                      {savedLogo || pendingLogo ? "Cambiar imagen" : "Subir imagen"}
                    </ToolsActionButton>
                    {savedLogo && !pendingLogo ? (
                      <ToolsActionButton
                        variant="danger"
                        disabled={busy || logoBusy}
                        onClick={() => void deleteLogo()}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Quitar
                      </ToolsActionButton>
                    ) : null}
                  </div>
                }
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={LOGO_ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    void onFileSelected(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                {pendingLogo ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted">
                      <span className="font-medium text-card-foreground">{sourceName}</span> →{" "}
                      {pendingLogo.ancho} × {pendingLogo.alto} puntos · {logoBytes.toLocaleString("es-VE")} bytes ·{" "}
                      {chunkCount(logoBytes)} bloque(s)
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <FieldLabel>Conversión a blanco y negro</FieldLabel>
                        <SegmentedToggle<LogoDitherMode>
                          value={ditherMode}
                          onChange={setDitherMode}
                          disabled={logoBusy}
                          ariaLabel="Modo de conversión"
                          options={[
                            { value: "floyd-steinberg", label: "Tramado (fotos, degradados)" },
                            { value: "threshold", label: "Umbral (logos planos, texto)" },
                          ]}
                        />
                      </div>
                      <label className="block">
                        <FieldLabel>Ancho: {maxWidth} puntos</FieldLabel>
                        <input
                          type="range"
                          min={64}
                          max={paperWidth}
                          step={8}
                          value={maxWidth}
                          disabled={logoBusy}
                          onChange={(e) => setMaxWidth(Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                      <label className="block">
                        <FieldLabel>
                          {ditherMode === "threshold" ? `Umbral: ${threshold}` : `Brillo: ${threshold}`}
                        </FieldLabel>
                        <input
                          type="range"
                          min={20}
                          max={235}
                          value={threshold}
                          disabled={logoBusy}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="w-full"
                        />
                      </label>
                      <div>
                        <FieldLabel>Invertir colores</FieldLabel>
                        <BooleanToggle value={invert} onChange={setInvert} disabled={logoBusy} />
                      </div>
                    </div>
                  </div>
                ) : savedLogo ? (
                  <p className="text-sm text-muted">
                    Logo cargado en la impresora: {savedLogo.ancho} × {savedLogo.alto} puntos · CRC {savedLogo.crc32}
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    La impresora no tiene logo. Suba un PNG o JPG; se convertirá a blanco y negro al ancho del papel.
                  </p>
                )}

                {pendingLogo || savedLogo ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Imprimir logo</FieldLabel>
                      <BooleanToggle value={logoActivo} onChange={setLogoActivo} disabled={busy || logoBusy} />
                    </div>
                    <div>
                      <FieldLabel>Posición</FieldLabel>
                      <SegmentedToggle<ToolsTicketAlign>
                        value={logoAlin}
                        onChange={setLogoAlin}
                        disabled={busy || logoBusy}
                        ariaLabel="Posición del logo"
                        options={ALIGN_OPTIONS}
                      />
                    </div>
                  </div>
                ) : null}

                {pendingLogo ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <ToolsActionButton
                      variant="primary"
                      loading={logoBusy}
                      disabled={busy}
                      onClick={() => void sendLogo()}
                    >
                      {logoProgress
                        ? `Enviando ${logoProgress.sent}/${logoProgress.total}…`
                        : "Enviar a la impresora"}
                    </ToolsActionButton>
                    <ToolsActionButton
                      disabled={logoBusy}
                      onClick={() => {
                        setSourceImage(null);
                        setSourceName("");
                        if (savedLogo) {
                          setLogoActivo(savedLogo.activo);
                          setLogoAlin(savedLogo.alin);
                        }
                      }}
                    >
                      Descartar
                    </ToolsActionButton>
                  </div>
                ) : logoSettingsDirty ? (
                  <div className="mt-4">
                    <ToolsActionButton
                      variant="primary"
                      loading={logoBusy}
                      disabled={busy}
                      onClick={() => void saveLogoSettings()}
                    >
                      Guardar ajustes del logo
                    </ToolsActionButton>
                  </div>
                ) : null}
              </ToolsPanelSection>

              {/* ---------- Estilos ---------- */}
              <ToolsPanelSection
                title="Estilos de fuente"
                description="Negrita, subrayado, tamaño y alineación por línea. El doble ancho reduce el máximo a 25 caracteres."
                icon={Type}
                tone="violet"
                headerActions={
                  <Link
                    href={toolsPrinterHeaderFooterPath(printer.serial)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Editar texto
                  </Link>
                }
              >
                {usingSampleText ? (
                  <p className="mb-3 text-xs text-muted">
                    Sin conexión con la impresora: se muestran líneas de ejemplo.
                  </p>
                ) : null}

                {(
                  [
                    ["Encabezado", headerLines, headerStyles, setHeaderStyles],
                    ["Pie de página", footerLines, footerStyles, setFooterStyles],
                  ] as const
                ).map(([label, lines, styles, setStyles]) => (
                  <div key={label} className="mb-4 last:mb-0">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h4>
                    {lines.length === 0 ? (
                      <p className="text-sm text-muted">Sin líneas configuradas.</p>
                    ) : (
                      <ul className="space-y-2">
                        {lines.map((text, index) => (
                          <LineStyleRow
                            key={`${label}-${index}`}
                            index={index}
                            text={text}
                            style={styles[index] ?? DEFAULT_TICKET_LINE_STYLE}
                            disabled={busy || savingStyles || capabilities?.estilos === false}
                            onChange={(style) =>
                              setStyles((current) => current.map((s, i) => (i === index ? style : s)))
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-2 gap-2">
                  <ToolsActionButton
                    variant="primary"
                    loading={savingStyles}
                    disabled={busy || !stylesDirty}
                    onClick={() => void saveStyles()}
                  >
                    Guardar estilos
                  </ToolsActionButton>
                  <ToolsActionButton disabled={busy || savingStyles || !stylesDirty} onClick={revertStyles}>
                    Revertir
                  </ToolsActionButton>
                </div>
              </ToolsPanelSection>
            </div>

            <div className="xl:sticky xl:top-4">
              <ToolsTicketPreview
                logo={previewLogo}
                paperWidthPx={paperWidth}
                headerLines={headerLines}
                headerStyles={headerStyles}
                footerLines={footerLines}
                footerStyles={footerStyles}
              />
            </div>
          </div>
        )}
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
