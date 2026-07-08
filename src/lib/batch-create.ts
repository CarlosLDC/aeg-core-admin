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

export type BatchRunFailure = {
  label: string;
  message: string;
};

export type BatchRunProgress = {
  done: number;
  total: number;
  currentLabel: string;
};

export type BatchRunResult = {
  succeeded: number;
  failed: BatchRunFailure[];
};

export function createCreationBatchId(): string {
  return crypto.randomUUID();
}

export async function runSerialBatch<T>(
  serials: string[],
  createOne: (serial: string, creationBatchId: string) => Promise<T>,
  onProgress?: (progress: BatchCreateProgress) => void,
  options?: { creationBatchId?: string },
): Promise<BatchCreateResult> {
  const failed: BatchItemFailure[] = [];
  let succeeded = 0;
  const creationBatchId = options?.creationBatchId ?? createCreationBatchId();

  for (let i = 0; i < serials.length; i++) {
    const serial = serials[i]!;
    onProgress?.({ done: i, total: serials.length, currentSerial: serial });
    try {
      await createOne(serial, creationBatchId);
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

export async function runBatch<TItem>(
  items: TItem[],
  runOne: (item: TItem) => Promise<void>,
  getLabel: (item: TItem) => string,
  onProgress?: (progress: BatchRunProgress) => void,
): Promise<BatchRunResult> {
  const failed: BatchRunFailure[] = [];
  let succeeded = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const label = getLabel(item);
    onProgress?.({ done: i, total: items.length, currentLabel: label });
    try {
      await runOne(item);
      succeeded++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al procesar el registro.";
      failed.push({ label, message });
    }
  }

  onProgress?.({
    done: items.length,
    total: items.length,
    currentLabel: "",
  });

  return { succeeded, failed };
}
