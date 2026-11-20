import { describe, expect, it } from "vitest";
import {
  blobViewUrl,
  isVercelBlobUrl,
  isVercelBlobUrlForStore,
} from "@/lib/blob-storage";
import {
  detectAllowedFileMime,
  extractVercelBlobStoreId,
} from "@/lib/blob-upload-server";

describe("blob-storage", () => {
  it("requires https for Vercel Blob URLs", () => {
    expect(
      isVercelBlobUrl("https://abc123.private.blob.vercel-storage.com/contracts/doc.pdf"),
    ).toBe(true);
    expect(
      isVercelBlobUrl("http://abc123.private.blob.vercel-storage.com/contracts/doc.pdf"),
    ).toBe(false);
    expect(isVercelBlobUrl("https://evil.example/doc.pdf")).toBe(false);
  });

  it("pins Vercel Blob URLs to the configured store ID", () => {
    expect(
      isVercelBlobUrlForStore(
        "https://store123.private.blob.vercel-storage.com/contracts/doc.pdf",
        "store123",
      ),
    ).toBe(true);
    expect(
      isVercelBlobUrlForStore(
        "https://otherstore.private.blob.vercel-storage.com/contracts/doc.pdf",
        "store123",
      ),
    ).toBe(false);
  });

  it("blocks dangerous schemes in blobViewUrl while allowing safe URLs", () => {
    expect(blobViewUrl("javascript:alert(1)")).toBe("#");
    expect(blobViewUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(blobViewUrl("vbscript:msgbox(1)")).toBe("#");
    expect(blobViewUrl("//evil.com/x.png")).toBe("#");
    expect(blobViewUrl("/local/doc.pdf")).toBe("/local/doc.pdf");
    expect(blobViewUrl("https://cdn.example.com/doc.pdf")).toBe(
      "https://cdn.example.com/doc.pdf",
    );
    expect(
      blobViewUrl("https://store123.private.blob.vercel-storage.com/contracts/a.pdf"),
    ).toBe(
      "/api/uploads/documents?url=https%3A%2F%2Fstore123.private.blob.vercel-storage.com%2Fcontracts%2Fa.pdf",
    );
  });
});

describe("blob-upload-server", () => {
  it("extracts storeId from Vercel Blob RW token", () => {
    expect(extractVercelBlobStoreId("vercel_blob_rw_AbC123xyz_secretpart")).toBe(
      "AbC123xyz",
    );
    expect(extractVercelBlobStoreId("invalid-token")).toBeNull();
  });

  it("detects allowed file types by magic bytes and rejects disguised HTML/scripts", () => {
    expect(detectAllowedFileMime(Buffer.from("%PDF-1.7\n..."))).toBe("application/pdf");
    expect(detectAllowedFileMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectAllowedFileMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectAllowedFileMime(Buffer.from("GIF89a..."))).toBe("image/gif");
    expect(detectAllowedFileMime(Buffer.from("RIFF1234WEBP"))).toBe("image/webp");
    expect(detectAllowedFileMime(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
  });
});
