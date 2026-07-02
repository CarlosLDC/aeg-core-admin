export const BLOB_UPLOAD_FOLDERS = ["contracts"] as const;

export type BlobUploadFolder = (typeof BLOB_UPLOAD_FOLDERS)[number];

export function isBlobUploadFolder(value: string): value is BlobUploadFolder {
  return (BLOB_UPLOAD_FOLDERS as readonly string[]).includes(value);
}
