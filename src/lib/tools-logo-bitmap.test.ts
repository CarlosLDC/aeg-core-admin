import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  chunkCount,
  crc32Hex,
  fitLogoDimensions,
  grayscaleToMonochrome,
  packMonochromeBitmap,
  rgbaToGrayscale,
  unpackMonochromeBitmap,
} from "@/lib/tools-logo-bitmap";

describe("fitLogoDimensions", () => {
  it("scales down preserving ratio with width multiple of 8", () => {
    const { width, height } = fitLogoDimensions(1000, 500, 384, 200);
    expect(width).toBe(384);
    expect(width % 8).toBe(0);
    expect(height).toBe(192);
  });

  it("limits by height", () => {
    const { width, height } = fitLogoDimensions(400, 800, 384, 200);
    expect(height).toBeLessThanOrEqual(200);
    expect(width % 8).toBe(0);
  });

  it("does not upscale small images", () => {
    expect(fitLogoDimensions(100, 50).width).toBe(96);
  });
});

describe("rgbaToGrayscale", () => {
  it("treats transparent pixels as white", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
    const gray = rgbaToGrayscale(rgba, 2, 1);
    expect(gray[0]).toBe(255);
    expect(gray[1]).toBe(0);
  });
});

describe("grayscaleToMonochrome + pack", () => {
  it("thresholds and packs MSB first", () => {
    const gray = new Float32Array([0, 255, 0, 255, 255, 255, 255, 0]);
    const mono = grayscaleToMonochrome(gray, 8, 1, { mode: "threshold" });
    expect(Array.from(mono.pixels)).toEqual([1, 0, 1, 0, 0, 0, 0, 1]);
    expect(Array.from(packMonochromeBitmap(mono))).toEqual([0b10100001]);
  });

  it("invert flips pixels", () => {
    const gray = new Float32Array([0, 255]);
    const mono = grayscaleToMonochrome(gray, 2, 1, { mode: "threshold", invert: true });
    expect(Array.from(mono.pixels)).toEqual([0, 1]);
  });

  it("floyd-steinberg on mid gray produces ~50% coverage", () => {
    const gray = new Float32Array(64 * 64).fill(128);
    const mono = grayscaleToMonochrome(gray, 64, 64, { mode: "floyd-steinberg" });
    const black = mono.pixels.reduce((sum, p) => sum + p, 0);
    expect(black / mono.pixels.length).toBeGreaterThan(0.4);
    expect(black / mono.pixels.length).toBeLessThan(0.6);
  });

  it("pack/unpack roundtrip", () => {
    const pixels = Uint8Array.from({ length: 16 * 3 }, (_, i) => (i * 7) % 3 === 0 ? 1 : 0);
    const packed = packMonochromeBitmap({ width: 16, height: 3, pixels });
    expect(packed.length).toBe(6);
    expect(Array.from(unpackMonochromeBitmap(packed, 16, 3).pixels)).toEqual(Array.from(pixels));
  });
});

describe("crc32Hex / base64 / chunks", () => {
  it("matches the standard CRC-32 check value", () => {
    expect(crc32Hex(new TextEncoder().encode("123456789"))).toBe("CBF43926");
  });

  it("base64 roundtrip", () => {
    const bytes = new Uint8Array([0, 1, 254, 255, 128]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it("chunk count", () => {
    expect(chunkCount(5760)).toBe(6);
    expect(chunkCount(0)).toBe(1);
  });
});
