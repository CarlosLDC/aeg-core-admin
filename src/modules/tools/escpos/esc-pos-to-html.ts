/**
 * ESC/POS → HTML — port de shared/modules/escPosToHtml.js
 * Expone parser y formatter reutilizables (sin dependencia de DOM).
 */

export type EscPosAlign = 'left' | 'center';

export interface EscPosLine {
  text: string;
  leftPart: string | null;
  rightPart: string | null;
  align: EscPosAlign;
  bold: boolean;
  isTitle: boolean;
  isSeparator: boolean;
}

export interface EscPosHtmlOptions {
  /** GRA/serial de la impresora para footer (NO FISCAL | GRA) */
  printerSerial?: string;
  /** Si true, no añade footer (documento no fiscal ya lo trae) */
  skipFooter?: boolean;
  /** Clases CSS base (por defecto las de main.css) */
  classNames?: Partial<EscPosClassNames>;
}

export interface EscPosClassNames {
  container: string;
  line: string;
  center: string;
  bold: string;
  title: string;
  separator: string;
  split: string;
  product: string;
  footer: string;
  left: string;
  right: string;
}

export interface EscPosParser {
  parse(rawContent: string): EscPosLine[];
}

export interface EscPosFormatter {
  format(lines: EscPosLine[], options?: EscPosHtmlOptions): string;
  formatRaw(rawContent: string, options?: EscPosHtmlOptions): string;
}

const DEFAULT_CLASS_NAMES: EscPosClassNames = {
  container: 'escpos-container',
  line: 'escpos-line',
  center: 'escpos-line--center',
  bold: 'escpos-line--bold',
  title: 'escpos-line--title',
  separator: 'escpos-separator',
  split: 'escpos-line--split',
  product: 'escpos-line--product',
  footer: 'escpos-footer',
  left: 'escpos-left',
  right: 'escpos-right',
};

export function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function productPrefixSplit(trimmed: string): { left: string; right: string } | null {
  const match = trimmed.match(/^(.+?)\s+(\([A-Z]\)\s+Bs\s*[\d.,]+)\s*$/i);
  return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function priceSplit(trimmed: string): { left: string; right: string } | null {
  const match = trimmed.match(/^(.+)\s+(Bs\s*[\d.,]+)\s*$/i);
  return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function facturaSplit(trimmed: string): { left: string; right: string } | null {
  const match = trimmed.match(/^(FACTURA\s*#?\s*:?)\s*(\d+)\s*$/i);
  return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function fechaHoraSplit(trimmed: string): { left: string; right: string } | null {
  const match = trimmed.match(/^(FECHA:\s*[\d/.-]+)\s+(HORA:\s*[\d:]+)\s*$/i);
  return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function noFiscalGraSplit(trimmed: string): { left: string; right: string } | null {
  const match = trimmed.match(/^NO FISCAL\s{2,}(GRA\d+)\s*$/i);
  return match ? { left: 'NO FISCAL', right: match[1] } : null;
}

function splitLine(trimmed: string): { left: string; right: string } | null {
  return (
    productPrefixSplit(trimmed) ||
    priceSplit(trimmed) ||
    facturaSplit(trimmed) ||
    fechaHoraSplit(trimmed) ||
    noFiscalGraSplit(trimmed)
  );
}

/**
 * Parsea contenido raw ESC/POS en líneas estructuradas.
 */
export function parseEscPos(rawContent: string): EscPosLine[] {
  const lines: EscPosLine[] = [];
  let currentAlign: EscPosAlign = 'left';
  let currentBold = false;
  let isTitle = false;

  const content = (rawContent || '')
    .replace(/[\x00-\x08]/g, '')
    .replace(/[\x0B\x0C]/g, '')
    .replace(/[\x0E-\x1F]/g, '')
    .replace(/\x7F/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const rawLines = content.split('\n');

  for (const rawLine of rawLines) {
    if (/!?a13!?/.test(rawLine)) {
      currentAlign = 'center';
      isTitle = true;
    }
    if (/!?a1[^0-9]/.test(rawLine) || /!?a1$/.test(rawLine)) {
      currentAlign = 'center';
    }
    if (/!?a0[^0-9]/.test(rawLine) || /!?a0$/.test(rawLine)) {
      currentAlign = 'left';
      isTitle = false;
    }
    if (/!?E1!?/.test(rawLine)) currentBold = true;
    if (/!?E0!?/.test(rawLine)) currentBold = false;

    let cleanLine = rawLine
      .replace(/!a\d+!/g, '')
      .replace(/!a\d+/g, '')
      .replace(/a\d+!/g, '')
      .replace(/a\d+/g, '')
      .replace(/!E[0-1]!/g, '')
      .replace(/!E[0-1]/g, '')
      .replace(/E[0-1]!/g, '')
      .replace(/E[0-1]/g, '')
      .replace(/!@/g, '')
      .replace(/!!/g, '')
      .replace(/@/g, '');

    cleanLine = cleanLine.replace(/^!|!$/g, '').replace(/!/g, '');
    cleanLine = cleanLine.replace(/\t/g, '  ');

    let trimmed = cleanLine.trim();
    if (!trimmed) continue;

    if (/^\s*\)\s*Total/i.test(trimmed)) {
      trimmed = trimmed.replace(/^\s*\)\s*/i, '').trim();
    }

    const isSeparator = /^-{4,}$/.test(trimmed) || /^={4,}$/.test(trimmed);
    const isCopia = /^\s*\*+\s*COPIA\s*\*+\s*$/i.test(trimmed);
    const lineAlign: EscPosAlign = isCopia ? 'center' : currentAlign;

    const priceOnlyMatch = trimmed.match(/^Bs\s*[\d.,]+$/i);
    if (priceOnlyMatch && lines.length > 0 && !lines[lines.length - 1].rightPart) {
      lines[lines.length - 1].rightPart = trimmed;
      continue;
    }

    const split = splitLine(trimmed);

    lines.push({
      text: trimmed,
      leftPart: split ? split.left : null,
      rightPart: split ? split.right : null,
      align: lineAlign,
      bold: currentBold || isTitle,
      isTitle,
      isSeparator,
    });
  }

  return lines;
}

function resolveClassNames(options?: EscPosHtmlOptions): EscPosClassNames {
  return { ...DEFAULT_CLASS_NAMES, ...options?.classNames };
}

/**
 * Convierte líneas parseadas a HTML.
 */
export function formatEscPosLines(
  lines: EscPosLine[],
  options: EscPosHtmlOptions = {}
): string {
  const classes = resolveClassNames(options);
  const parts: string[] = [];

  for (const line of lines) {
    const lineClasses = [classes.line];
    if (line.align === 'center') lineClasses.push(classes.center);
    if (line.bold) lineClasses.push(classes.bold);
    if (line.isTitle) lineClasses.push(classes.title);

    if (line.isSeparator) {
      parts.push(`<div class="${classes.separator}"></div>`);
    } else if (line.rightPart) {
      const left = escapeHtml(line.leftPart || line.text || '');
      const right = escapeHtml(line.rightPart);
      const isProduct = /^\([A-Z]\)\s+Bs\s*[\d.,]+/i.test(line.rightPart);
      const productClass = isProduct ? ` ${classes.product}` : '';
      parts.push(
        `<div class="${lineClasses.join(' ')} ${classes.split}${productClass}"><span class="${classes.left}">${left}</span><span class="${classes.right}">${right}</span></div>`
      );
    } else {
      parts.push(
        `<div class="${lineClasses.join(' ')}">${escapeHtml(line.text)}</div>`
      );
    }
  }

  const { printerSerial, skipFooter } = options;
  if (printerSerial && !skipFooter) {
    const gra = escapeHtml(printerSerial);
    parts.push(
      `<div class="${classes.line} ${classes.split} ${classes.footer}"><span class="${classes.left}">NO FISCAL</span><span class="${classes.right}">${gra}</span></div>`
    );
  }

  return `<div class="${classes.container}">${parts.join('')}</div>`;
}

/**
 * Atajo: raw → HTML (equivalente a window.escPosToHtml)
 */
export function escPosToHtml(
  rawContent: string,
  options: EscPosHtmlOptions = {}
): string {
  if (!rawContent) return '<p>Contenido vacío</p>';
  return formatEscPosLines(parseEscPos(rawContent), options);
}

export const defaultEscPosParser: EscPosParser = { parse: parseEscPos };

export const defaultEscPosFormatter: EscPosFormatter = {
  format: formatEscPosLines,
  formatRaw: escPosToHtml,
};

export function createEscPosPipeline(): {
  parser: EscPosParser;
  formatter: EscPosFormatter;
} {
  return {
    parser: defaultEscPosParser,
    formatter: defaultEscPosFormatter,
  };
}
