import type { BlobUploadFolder } from "@/lib/blob-upload-categories";
import {
  blobDocumentLabel,
  BLOB_DOCUMENT_ACCEPT,
  BLOB_DOCUMENT_MAX_BYTES,
  documentViewUrl,
  isPdfUrl,
  uploadBlobDocument,
  validateBlobDocumentFile,
} from "@/lib/blob-documents";
import type { ContractKind } from "@/types/contract";

export {
  blobDocumentLabel as contractDocumentLabel,
  BLOB_DOCUMENT_ACCEPT as CONTRACT_DOCUMENT_ACCEPT,
  BLOB_DOCUMENT_MAX_BYTES as CONTRACT_DOCUMENT_MAX_BYTES,
  documentViewUrl as contractDocumentViewUrl,
  isPdfUrl,
  validateBlobDocumentFile as validateContractDocumentFile,
};

export async function uploadContractDocument(
  file: File,
  _kind: ContractKind,
): Promise<string> {
  return uploadBlobDocument(file, "contracts" satisfies BlobUploadFolder);
}
