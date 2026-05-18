export type BatchItemFailure = {
  serial: string;
  message: string;
};

export type BatchCreateProgress = {
  done: number;
  total: number;
  currentSerial: string;
};

export type BatchCreateResult = {
  succeeded: number;
  failed: BatchItemFailure[];
};

export async function runSerialBatch<T>(
  serials: string[],
  createOne: (serial: string) => Promise<T>,
  onProgress?: (progress: BatchCreateProgress) => void,
): Promise<BatchCreateResult> {
  const failed: BatchItemFailure[] = [];
  let succeeded = 0;

  for (let i = 0; i < serials.length; i++) {
    const serial = serials[i]!;
    onProgress?.({ done: i, total: serials.length, currentSerial: serial });
    try {
      await createOne(serial);
      succeeded++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al crear el registro.";
      failed.push({ serial, message });
    }
  }

  onProgress?.({
    done: serials.length,
    total: serials.length,
    currentSerial: "",
  });

  return { succeeded, failed };
}
