/**
 * Conversión de imágenes a raster monocromo 1bpp (formato GS v 0) para el logo del ticket.
 * Funciones puras: reciben RGBA (como ImageData.data) para poder probarse sin DOM.
 */

export const LOGO_DEFAULT_MAX_WIDTH = 384;
export const LOGO_DEFAULT_MAX_HEIGHT = 200;
export const LOGO_CHUNK_BYTES = 1024;
export const LOGO_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/bmp", "image/webp"];
export const LOGO_MAX_FILE_BYTES = 2 * 1024 * 1024;

export type LogoDitherMode = "floyd-steinberg" | "threshold";

export type MonochromeBitmap = {
  width: number;
  height: number;
  /** 1 byte por punto: 1 = negro, 0 = blanco. */
  pixels: Uint8Array;
};

/** Calcula dimensiones que respetan proporción, máximos y ancho múltiplo de 8. */
export function fitLogoDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth = LOGO_DEFAULT_MAX_WIDTH,
  maxHeight = LOGO_DEFAULT_MAX_HEIGHT,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 8, height: 1 };
  }
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = Math.max(8, Math.floor((sourceWidth * scale) / 8) * 8);
  const height = Math.max(1, Math.min(maxHeight, Math.round((width / sourceWidth) * sourceHeight)));
  return { width, height };
}

/** RGBA → luminancia 0–255; los píxeles transparentes cuentan como blanco. */
export function rgbaToGrayscale(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum * a + 255 * (1 - a);
  }
  return gray;
}

export function grayscaleToMonochrome(
  gray: Float32Array,
  width: number,
  height: number,
  options: { mode: LogoDitherMode; threshold?: number; invert?: boolean },
): MonochromeBitmap {
  const threshold = options.threshold ?? 128;
  const buffer = Float32Array.from(gray);
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = buffer[i];
      const black = old < threshold;
      pixels[i] = (black ? 1 : 0) ^ (options.invert ? 1 : 0);

      if (options.mode === "floyd-steinberg") {
        const error = old - (black ? 0 : 255);
        if (x + 1 < width) buffer[i + 1] += (error * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) buffer[i + width - 1] += (error * 3) / 16;
          buffer[i + width] += (error * 5) / 16;
          if (x + 1 < width) buffer[i + width + 1] += error / 16;
        }
      }
    }
  }
  return { width, height, pixels };
}

/** Empaqueta a 1bpp, filas de arriba abajo, MSB primero (GS v 0). */
export function packMonochromeBitmap(bitmap: MonochromeBitmap): Uint8Array {
  const bytesPerRow = Math.ceil(bitmap.width / 8);
  const out = new Uint8Array(bytesPerRow * bitmap.height);
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (bitmap.pixels[y * bitmap.width + x]) {
        out[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return out;
}

export function unpackMonochromeBitmap(
  packed: Uint8Array,
  width: number,
  height: number,
): MonochromeBitmap {
  const bytesPerRow = Math.ceil(width / 8);
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = (packed[y * bytesPerRow + (x >> 3)] >> (7 - (x & 7))) & 1;
    }
  }
  return { width, height, pixels };
}

let crcTable: Uint32Array | null = null;

/** CRC-32 IEEE, hex en mayúsculas (8 dígitos). */
export function crc32Hex(data: Uint8Array): string {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function chunkCount(byteLength: number, chunkBytes = LOGO_CHUNK_BYTES): number {
  return Math.max(1, Math.ceil(byteLength / chunkBytes));
}
